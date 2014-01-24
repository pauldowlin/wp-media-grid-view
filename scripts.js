var wpMediaGrid;
var timeoutId;
var tagSlug;

(function($) {
	wpMediaGrid = {
		init: function() {
			// Moar media!
			$( '.more-media' ).on( 'click', function(event) {
				event.preventDefault();
				var link = $(this);
				if ( link.hasClass( 'loading' ) ) {
					return;
				}

				var url = link.data('url'),
					next_page = parseInt( link.attr('href') ) + 1,
					filter = '',
					tag = '';
				filter = $( '.media-nav' ).data( 'filter' );
				tag = $( '.media-nav' ).data( 'tag' );
				link.addClass( 'loading' ).html( 'Loading more items&hellip;' );
				//Default ajax action
				// ** Just sayin' -
				// - shouldn't we be using $.Post then send to admin-ajax.php with nonce?
				
				// For now just test to see if Tag search is on and if so, skip
				if(!tagSlug) {
					$.get( url, {
						media_action: 'more',
						next_page: next_page,
						filter: filter,
						tag: tag
					} ).done( function(data) {
						if ( data ) {
							$( '.media-grid' ).append( data );
							wpMediaGrid.changeThumbSize( $( '.thumbnail-size input' ).val() );
							link.attr( 'href', next_page.toString() );
							link.removeClass( 'loading' ).html('Get moar!');
						} else {
							// Don't remove!  We need that link later on
							//link.remove();
						}
						// added double check to see if tags search is still on
						if(!$('.live-search').hasClass('active')) {
							wpMediaGrid.initLiveSearch();
						}
						wpMediaGrid.viewCount();
						if(  $('.media-select-all input').is(":checked") ) {
							if( confirm( 'Select next page worth of items?' ) ) {
								wpMediaGrid.toggleSelectAll();
							}
						}
						
					});
				}
				// If Tag search is active than call pd_custom_header for query and paging
				if(tagSlug) {
					$.post(pdAjax.ajaxurl,
					{
						action : 'pd_custom_header',
						//parameters
						tagSlug : tagSlug,
						next_page : next_page,
						customDeleteNonce : pdAjax.customDeleteNonce
					}).done(function(data) {
						if(data) {
							$( '.media-grid' ).append( data );
							wpMediaGrid.changeThumbSize( $( '.thumbnail-size input' ).val() );
							link.attr( 'href', next_page.toString() );
							link.removeClass( 'loading' ).html('Get moar!');
						} else {
							//Don't remove!  We need that link later on
							//link.remove();
						}
						wpMediaGrid.viewCount();
						if(  $('.media-select-all input').is(":checked") ) {
							if( confirm( 'Select next page worth of items?' ) ) {
								wpMediaGrid.toggleSelectAll();
							}
						}
					});
					
				}
			});

			// Inifite Scroll
			$(window).scroll(function () {
				if ($(window).scrollTop() >= $(document).height() - $(window).height() - 800) {
					$( '.more-media' ).trigger( 'click' );
				}
			});

			// Size Slider
			wpMediaGrid.changeThumbSize( 1 );
			$(".thumbnail-size input").bind("slider:changed", function (event, data) {
				wpMediaGrid.changeThumbSize( data.value );
			});

			// Keyboard Nav
			wpMediaGrid.initKeyboardNav();

			// Live search of viewable items
			wpMediaGrid.initLiveSearch();
			
			/**
			 *  Media Tags Filtering
			 *
			 */
			//Disable LiveSearch
			$('.live-search a').on('click', function() {
				if($(this).hasClass('active')) {
					$(this).removeClass('active');
					$(this).parent().removeClass('active');
					$('.live-search input').attr('placeholder', 'Search viewable media');
					filter = null;
					wpMediaGrid.initLiveSearch(filter);
					$(this).removeClass('dashicons-search').addClass('dashicons-tag');
					$(this).attr('title', 'Filter by Media Tags');
					//make sure that our Moar Media link is active
					$('.more-media').removeClass('loading').html('Get M
				}else {
					$(this).addClass('active');
					$(this).parent().addClass('active');
					$('.live-search input').attr('placeholder', 'Search Media Tags');
					$(this).removeClass('dashicons-tag').addClass('dashicons-search');
					$(this).attr('title', 'Turn on live search');
					filter = true;
					wpMediaGrid.initLiveSearch(filter);
					wpMediaGrid.sendAjaxTags();
				}
			});
			//Initial Display viewable items count
			wpMediaGrid.viewCount();
			
			//Toggle Select all viewable items
			$( '.media-select-all ' ).poshytip({
				content: 'All viewable items',
				hideTimeOut: '5000'
			});
			$( '.media-select-all input[type=checkbox]' ).on('click', function() {
				wpMediaGrid.toggleSelectAll();				
			});
			//Select single item
			$('.media-select input[type=checkbox]').on('click', function() {
				var item = $(this).closest( '.media-item' );
					id = item.data('id'),
					details = item.find( '.media-details' ),
					selected = $('#selected-media-details .selected-media');
					
				if( $(this).is(":checked") ) {
					item.addClass('selected');
					/* 
					selected.hide().prepend('<li class="selected-details" id="detail-' + id + '" data-id="' + id + '">'  + details.html() + '</li>').fadeIn(500);
					selected.find('#detail-' + id + ' .media-options').hide();
					selected.find('#detail-' + id + ' h3').hide();
					selected.find('#detail-' + id + ' .media-meta').hide();
					*/
				}else {
					item.removeClass('selected');
					//selected.find( '#detail-' + id ).remove();
				}
				count = $('.media-grid .selected').length;
				wpMediaGrid.selectedMediaPopup(count);
			});
			
			// Unselect All
			$( '#selected-media-details' ).on( 'click', '.selected-unselect', function(event) {
				event.preventDefault();
				
				count = 0;
				wpMediaGrid.selectedMediaPopup(count);
				wpMediaGrid.toggleSelectAll();
			});
			
			// Close modal
			$( '#media-modal .close-button' ).on( 'click', function() {
				wpMediaGrid.closeModal();
			});

			// Highlight Filepath on click
			$( '.modal-details' ).on( 'click', '.mm-filepath input', function() {
				$( this ).select();
			} );

			 //View Item
			$( '.media-grid' ).on( 'click', '.media-thumb', function(event) {
				var item = $( this ).closest( '.media-item' );
				wpMediaGrid.openModal( item );
			} );
			
			// Delete Single Item
			$( '.media-grid' ).on( 'click', '.media-delete', function( event ) {
				event.preventDefault();
				event.stopPropagation();
				if( confirm( 'This will delete this media item from your library.' ) ) {
					//Need the ID just the # please
					var item = $( this ).closest( '.media-item' ),
						itemId = [item.attr( 'data-id')];

					//Now send it out
					$.post(
						pdAjax.ajaxurl,
						{
							//wp ajax action
							action : 'pd_custom_delete',
							//add parameters
							itemId : itemId,
							media_action: 'update',
							//send nonce along with everything else
							customDeleteNonce : pdAjax.customDeleteNonce
						},
						function( response ) {
							if(response != 'Fail') {
								//get the response in readable form
								var responseID = $.parseJSON(response);
								wpMediaGrid.gridDelete(responseID);
							}else {
								alert('Something went wrong.  Please try again later');
							}
						}
					);
					
					
				}
			});
			
			// Delete All Selected Items
			$('#selected-media-details').on('click', '.selected-delete',  function(event) {
				event.preventDefault();
				event.stopPropagation();
				if( confirm( 'This will delete selected media items from your library.' ) ) {
					// Grab all selected id's and place into array 
					var itemId = [],
						itemcount = $('.media-grid .selected');
					$('.media-grid .selected').each(function() {
						itemId.push($(this).attr('data-id'));
					});
					
					$.post(
						pdAjax.ajaxurl,
						{
							//wp ajax action
							action : 'pd_custom_delete',
							
							//add parameters
							itemId : itemId,
					
							//send nonce along with everything else
							customDeleteNonce : pdAjax.customDeleteNonce
							
						},
						function( response ) {
							if(response != 'Fail') {
								//get the response in readable form
								var responseID = $.parseJSON(response);
								//go thru each response and delete dom elements
								$.each(responseID, function(i, item) {
									//console.log( 'Each function: ' + item );
									wpMediaGrid.gridDelete(item);
								});
								count = 0;
								wpMediaGrid.selectedMediaPopup(count);
							}else {
								alert('Something went wrong.  Please try again later');
							}
						}
					);
				}
			});
			
			$( '#media-modal' ).on( 'mouseenter mouseleave', '.star', function() {
				var rating = $(this),
					prev_stars = rating.prevAll();

				prev_stars.toggleClass( 'hover' );
			} );
		},

		initLiveSearch: function(filter) {
			if(!filter) {
				$( '.media-grid' ).liveFilter('.live-search input', 'li', {
					filterChildSelector: '.media-details'
				});
			}else {
				$( '.media-grid' ).liveFilter('.live-search input','',{ destroy: true });
			}
			
		},

		openModal: function( item ) {
			var modal = $( '#media-modal' ),
				media_compare = modal.find( '.compare-items' ),
				media_details = modal.find( '.modal-details' ),
				media_actions = modal.find( '.modal-actions' ),
				media_view_button = media_actions.find( '.full-size' ),
				item_id = item.attr( 'id' ),
				url = item.data( 'url' ),
				title = item.find( '.media-details h3' ).html(),
				meta = item.find( '.media-meta' ).clone();

			modal.find( '#media-id' ).val( item_id );
			media_view_button.attr( 'href', url );

			media_compare.append( '<li><img src="' + url + '"></li>' );
			media_details.append( '<h3>' + title + '</h3>' );
			media_details.append( meta );

			var current_item_id = modal.find( '#media-id' ).val(),
				current_item = $( '#' + current_item_id ),
				prev_item = current_item.prev( '.media-item' ),
				next_item = current_item.next( '.media-item' ),
				prev_item_thumb = prev_item.find( '.media-details .attachment-thumbnail' ).clone(),
				next_item_thumb = next_item.find( '.media-details .attachment-thumbnail' ).clone();

			modal.find( '.nav-prev' ).append( prev_item_thumb );
			modal.find( '.nav-next' ).append( next_item_thumb );

			/*
			modal.find( '.nav-prev' ).on( 'click', function() {
				wpMediaGrid.clearModal();
				prev_item.find( '.media-thumb' ).trigger( 'click' );
			} );

			modal.find( '.nav-next' ).on( 'click', function() {
				wpMediaGrid.clearModal();
				next_item.find( '.media-thumb' ).trigger( 'click' );
			} );
			*/

			if ( modal.is( ':hidden' ) ) {
				$( 'body' ).addClass( 'blurred' );
				modal.fadeIn(200);
			}
		},

		closeModal: function() {
			$( 'body' ).removeClass( 'blurred' );
			$( '#media-modal' ).fadeOut(200);
			wpMediaGrid.clearModal();
		},

		clearModal: function() {
			var modal = $( '#media-modal' );
			modal.find( '.compare-items' ).empty();
			modal.find( '.modal-details' ).empty();
			modal.find( '.nav-prev' ).empty();
			modal.find( '.nav-next' ).empty();
		},

		initKeyboardNav: function() {
			var modal = $( '#media-modal' );

			$(document).keydown(function(e){
				if ( modal.is( ':visible' ) ) {
					var current_item_id = modal.find( '#media-id' ).val(),
						current_item = $( '#' + current_item_id ),
						prev_item = current_item.prev( '.media-item' ),
						next_item = current_item.next( '.media-item' );
					if (e.keyCode == 37) {
						wpMediaGrid.clearModal();
						prev_item.find( '.media-thumb' ).trigger( 'click' );
					} else if (e.keyCode == 39) {
						wpMediaGrid.clearModal();
						next_item.find( '.media-thumb' ).trigger( 'click' );
					} else if (e.keyCode == 27 ) {
						wpMediaGrid.closeModal();
					}
				}
			});
		},

		changeThumbSize: function(ratio) {
			var container_size = 200 * ratio,
				thumb_size = 180 * ratio,
				containers = $( '.media-item' ),
				thumbs = containers.find( '.media-thumb' )
				images = thumbs.find( 'img' );

			containers.height( container_size );
			containers.width( container_size );

			$( '.sub-grid' ).height( container_size );
			$( '.sub-grid' ).width( container_size );

			thumbs.height( thumb_size );
			thumbs.width( thumb_size );

			images.each( function(index) {
				$( this ).removeClass('default');
				og_height = $(this).data('height');
				og_width = $(this).data('width');
				$( this ).height( og_height * ratio );
				$( this ).width( og_width * ratio );
			} );
		},

		gridDelete: function(item) {
			var itemDel = $('*[data-id="'+item+'');
			itemDel.css({
				'opacity': '0',
				'margin-left': '-200px'
			});
			setTimeout( function() {
				if( itemDel.hasClass( 'selected' ) ) {
					itemDel.trigger( 'click' );
				}
				itemDel.remove();
				wpMediaGrid.initLiveSearch();
				wpMediaGrid.totalCount();
				wpMediaGrid.viewCount();
				
			}, 300);
		},

		getParam: function(name) {
			name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
			var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
				results = regex.exec(location.search);
			return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
		},
		
		// Total number of items on the page
		viewCount: function() {
			var onPage = $('.media-grid .media-item:visible'),
				displayTotalCount = $( '.media-nav #view-items' );
			if(onPage) {
				displayTotalCount.html(onPage.length + ' <span>viewable</span>');
			}
		},
		
		totalCount: function() {
			var found = $('#total-items span.found').text(),
				newfound = parseInt(found) - 1;
			$('#total-items span.found').text(newfound);
		},
		
		//Select all viewable items on page
		toggleSelectAll: function(n) {
			//Check to see if things are already checked
			if(  $('.media-select-all input').is(":checked") || n ) {
				$( '.media-grid .media-item').each(function() {
					var id = $(this).data('id'),
						details = $(this).find( '.media-details' ),
						selected = $('#selected-media-details .selected-media');
						
					if( $(this).hasClass('selected')) {
						//Do nothing
					} else {
						if ( $(this).is(':visible')) {
							$( this ).addClass('selected');
							$(this).find( '.media-select input[type=checkbox]' ).attr('checked','checked');
							//selected.hide().prepend('<li class="selected-details" id="detail-' + id + '" data-id="' + id + '">'  + details.html() + '</li>').fadeIn(500);
							//selected.find('#detail-' + id + ' .media-options').hide();
							//selected.find('#detail-' + id + ' h3').hide();
							//selected.find('#detail-' + id + ' .media-meta').hide();
						} 
						$('.media-select-all span').text('Uncheck All');
						count = $('.media-grid .selected').length;
						wpMediaGrid.selectedMediaPopup(count);
					}
				});
			} else {
				$( '.media-grid > .media-item' ).removeClass('selected');
				$( '.media-grid > .media-item .media-select input[type=checkbox]' ).removeAttr('checked');
				//$( '#selected-media-details .selected-media li' ).remove();
				$('.media-select-all span').text('Check All');
				count = $('.media-grid .selected').length;
				wpMediaGrid.selectedMediaPopup(count);
			} 
		},
		
		//Whole new Selected Media Popup!
		selectedMediaPopup: function(count) {
			var media_details = $( '#selected-media-details' );
			if(count>0){
				if(media_details.is(':hidden')){
					media_details.fadeIn(400);
				}
				//show count 
				$('#selected-media-details .selected-count strong' ).html(count);		
			}else {
				media_details.fadeOut(400);
			}
			
			
		},
		
		// Send Media Tag via AJAX to upload.php?grid and display returned items
		sendAjaxTags: function() {
			var textBox = $('.live-search input');
			if(textBox.parent().hasClass('active')) {
				textBox.on('keypress', function(event) {
					if(event.which == '13'){
						var textholder = $(this).val();
							// pdAjax.tagsList comes from wp_localize_script in php file
							pdArray = $(pdAjax.tagsList).filter(function(){
								return this.value == textholder;
							});
						if(textholder == '') {
							return;
						}
						if(pdArray.length > 0) {
							var tagValue = pdArray[0]['value'],
								overlay = $('<div id="media-overlay"></div>');
							// global var
							tagSlug = pdArray[0]['slug'];
							overlay.appendTo($('#media-library').attr('display', 'block'));
							//Actually send it!
							$.post( pdAjax.ajaxurl,
							{
								//action
								action : 'pd_custom_header',
								//add parameters
								tagSlug : tagSlug,
								//send nonce along with everything else
								customDeleteNonce : pdAjax.customDeleteNonce
							}).done(function( data ) {
								if(data) {
									$( '.media-grid li' ).remove();
									$( '.media-grid' ).append( data );
									wpMediaGrid.changeThumbSize( $( '.thumbnail-size input' ).val() );
									wpMediaGrid.totalCount();
									wpMediaGrid.viewCount();
									overlay.remove();
									//revert .more-media link back to href=1
									$('.more-media').removeClass('loading').attr('href', '1');
								}
							}).fail(function(error) {
								alert('We are sorry. Something went wrong.  Server responded with: ' + error);
							});
						}else {
							//Getting ready for autocomplete so there won't be an else situation
							console.log('sendAjaxsTags:  No Match!!');
						}
					}
				});
			}
		},
	}

	$(document).ready(function($){ wpMediaGrid.init(); });
})(jQuery);