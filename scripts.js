var wpMediaGrid;
var timeoutId;
var tagSlug;
var filter;
var mySearch=true;  //tells search box we reset the query

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
					$('.media-grid').find('#ajax-foundAttach').remove(); //for all items update
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

			/*
			 * Search Input controls and functionality
			 *
			 *     Live Search of viewable items, Media Tags Search, Full search of all items
			*/
			 // add controls along top of search box
			var liveSearchIcon = '<a class="dashicons dashicons-visibility" title="Search visible items"></a>',
				mediaTagIcon = '<a class="dashicons dashicons-tag" title="Search Media Tags"></a>',
				fullSearchIcon = '<a class="dashicons dashicons-search" title="Search all items"></a>';
			$('.live-search').append(liveSearchIcon, mediaTagIcon, fullSearchIcon);
			
			//set live search as initial search capability
			$('.dashicons-visibility').addClass('active');
			
			// Live search of viewable items
			wpMediaGrid.initLiveSearch();
			
			//Enable Tag search :: disable live and full searches
			$('#media-library').on('click', '.dashicons-tag', wpMediaGrid.tagSearchIcon);
			
			//Enable Full search :: disable live and tag searches
			$('#media-library').on('click', '.dashicons-search', wpMediaGrid.tagSearchIcon);
			
			//Enable Live search :: disable tag and full searches
			$('#media-library').on('click', '.dashicons-visibility', wpMediaGrid.tagSearchIcon);
			
			//----------------------------------------------------------------------------- end search input
			
			//Initial Display viewable items count
			wpMediaGrid.viewCount();
			
			//Toggle Select all viewable items
			$( '.media-select-all' ).on('click', 'input[type=checkbox]',wpMediaGrid.toggleSelectAll);
			
			//Select single item
			$('body').on('click', '.media-select input[type=checkbox]' , function() {
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
				$('.media-select-all input[type=checkbox]').removeAttr('checked');
				wpMediaGrid.toggleSelectAll();
				count = 0;
				wpMediaGrid.selectedMediaPopup(count);
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
						itemId = [item.attr( 'data-id')],
						which = this.className;

					//Now send it out
					wpMediaGrid.sendDelete(itemId, which);	
				}
			});
			
			// Delete All Selected Items
			$('#selected-media-details').on('click', '.selected-delete',  function(event) {
				event.preventDefault();
				event.stopPropagation();
				if( confirm( 'This will delete selected media items from your library.' ) ) {
					// Grab all selected id's and place into array 
					var itemId = [],
						itemcount = $('.media-grid .selected'),
						which = this.className;
					$('.media-grid .selected').each(function() {
						itemId.push($(this).attr('data-id'));
					});
					
					//send it out
					wpMediaGrid.sendDelete(itemId, which);
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
					filterChildSelector: '.media-details',
					after: function() {
						wpMediaGrid.viewCount();
					}
				});
			}else {
				$( '.media-grid' ).liveFilter('.live-search input','li',{ destroy: true });
			}
			
		},

		initTagSearch: function(pd) {
			
			if(!pd){
				if( $('#media-grid-search').data('ui-autocomplete') ) {
				$('#media-grid-search').autocomplete('destroy');
				}
				$('#media-library').off('input', '#media-grid-search');
			}else {
				$('#media-grid-search').autocomplete({
					minLength: 0,
					//autoFocus: true,
					position: {my: 'top', at: 'bottom+10'},
					source: function(request, response) {
						var source = pdAjax.tagsList;
						var filtered_and_sorted_list =  $.map(source, function(item){
							var score = item['value'].toLowerCase().score(request.term.toLowerCase());
							if(score > 0)
								return { 'value': item['value'], 'slug': item['slug'], 'rank': score }
						}).sort(function(a, b){ return b.rank - a.rank });
						if(filtered_and_sorted_list.length>0){
							response(filtered_and_sorted_list);
						}
					},
					focus: function(event, ui) {
						if(ui.item) {
						$('#media-grid-search').val(ui.item.value);
						return false;
						}
					},
					change: function(event, ui) {
						$('#media-grid-search').val('');
					}
					
				});
				//Pressing enter with empty input resets query back to original
				// nothing in autocomplete detects enter key with input cleared so...
				$('#media-library #media-grid-search').on('keyup, keydown', function(e) {
					var text = $(this).val(),
						code = e.which;
					if(code==13 && text==""){
						if(!mySearch) {
						wpMediaGrid.sendForAll();
						$(this).blur();
						}
					}
				});
				//autofocus only after keypress
				$('#media-library').on('input', '#media-grid-search',function(e) {
					console.log('Input check fired: ' + this.value.length);
					if(this.value.length == 0) {
					
						$( this ).autocomplete( "option", "autoFocus", false );
					}else {
						$( this ).autocomplete( "option", "autoFocus", true );
					}
				});
				//Open menu when input is selected
				$('#media-library #media-grid-search').focus(function(event) {
					if($('.dashicons-tag').hasClass('active')) {
						$(this).autocomplete('search', '');
					}
				});
				//send it off when user selects 
				$('#media-library #media-grid-search').on('autocompleteselect', function(event, ui) {
					//uncheck things before we send ajax
					if($('.media-select-all input[type=checkbox]').is(':checked')){
						$('.media-select-all input[type=checkbox]').trigger('click');
					}
					wpMediaGrid.toggleSelectAll(true);
					//disable things so no inadvertant clicking or selecting
					wpMediaGrid.disableMedia(true);
					//send call via Ajax for new media items based on tags
					var mediaTagSearch = $('.live-search .dashicons-tag'),
						myTag = ui.item.slug;
					if(mediaTagSearch.hasClass('active')) {
						if(myTag) {
							var overlay = $('<div id="media-overlay"></div>');
							// global var
							tagSlug = myTag;
							overlay.appendTo($('.media-grid').attr('display', 'block'));
							$('.media-grid').find('#ajax-foundAttach').remove();
							//Actually send it!
							$.post( pdAjax.ajaxurl,
							{
								//action
								action : 'pd_custom_header',
								//add parameters
								tagSlug : myTag,
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
									//enable media library
									wpMediaGrid.disableMedia(null);
									//tell search box that we have made a non-live search
									mySearch = null;
								}
							}).fail(function(error) {
								alert('We are sorry. Something went wrong.  Server responded with: ' + error);
								overlay.remove();
								wpMediaGrid.disableMedia(null);
								
							});
						}else {
							//Getting ready for autocomplete so there won't be an else situation
							console.log('sendAjaxsTags:  No Match!!');
						}
			
					}
				});
			}
		},
		
		//When tag icon is clicked activate input to accept tag search
		tagSearchIcon: function() {
			$('.live-search').children('.active').removeClass('active');
			$('.live-search input').val('');
			//update placeholder and init appropriate searches
			switch($(this).attr('class')) {
				case ('dashicons dashicons-tag'):
					$(this).addClass('active');
					$('.live-search input').attr('placeholder', 'Search Media Tags');
					filter = true;
					wpMediaGrid.initLiveSearch(filter);
					wpMediaGrid.initTagSearch(true);
					$('.live-search input').focus();
					break;
				case ('dashicons dashicons-search'):
					$(this).addClass('active');
					$('.live-search input').attr('placeholder', 'Search All Media');
					filter = true;
					wpMediaGrid.initLiveSearch(filter);
					wpMediaGrid.initTagSearch(null);
					$('.live-search input').focus();
					break;
				case ('dashicons dashicons-visibility'):
					$(this).addClass('active');
					$('.live-search input').attr('placeholder', 'Search Viewable Media');
					filter = null;
					wpMediaGrid.initLiveSearch(filter);
					wpMediaGrid.initTagSearch(null);
					$('.live-search input').focus();
					break;
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
		
		//show update div with positive feedback that item(s) were deleted
		showUpdate: function(num) {
			var messageNum = num + '  Media attachments permanently deleted';
				message = 'Media attachment permanently deleted';
			
			if(num) {
				$('#message').text(messageNum);
			}else {
				$('#message').text(message);
			}
			$('#message').fadeIn().delay(6000).fadeOut();
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
			var found = $('#ajax-foundAttach').attr('data-id');
			if(found) {
				$('#total-items span').html(found);
			}	
		},
		
		//Select all viewable items on page
		toggleSelectAll: function(selected) {
			//Check to see if things are already checked
			if(  $('.media-select-all input').is(":checked") && !selected) {
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
				media_details.fadeOut(100);
			}
			
			
		},
		
		//Send request to delete media items
		sendDelete: function(itemId, which) {
			//Still need to add loading feedback
			
			$.post(
				pdAjax.ajaxurl,
				{
					action : 'pd_custom_delete',

					itemId : itemId,

					customDeleteNonce : pdAjax.customDeleteNonce
				}).done(function(data) {
					if((which) == 'media-delete') {
						var responseID = $.parseJSON(data);
						wpMediaGrid.gridDelete(responseID);
						wpMediaGrid.showUpdate();
						console.log(' sendDelete Filter is: ' + filter);
						wpMediaGrid.initLiveSearch();
					}else if((which) == 'selected-delete'){
						console.log('Selected-delete!');
						var responseID = $.parseJSON(data);
						//go thru each response and delete dom elements
						$.each(responseID, function(i, item) {
							wpMediaGrid.gridDelete(item);
						});
						$( '.media-grid > .media-item .media-select input[type=checkbox]' ).removeAttr('checked');
						count = 0;
						wpMediaGrid.selectedMediaPopup(count);
						wpMediaGrid.showUpdate(responseID.length);
						//this repopulates grid with default query - minus the ones deleted of course
						//and only called if all media items on the page
						wpMediaGrid.sendForAll();
					}
				}).fail(function(error) {
					alert('We are sorry. Something went wrong.  Please try again later');
				});
			
		},
		
		//Ajax request for all media items
		sendForAll: function() {
			var overlay = $('<div id="media-overlay"></div>');
			overlay.appendTo($('.media-grid').attr('display', 'block'));
			tagSlug = null;
			$('.media-grid').find('#ajax-foundAttach').remove();
			$.post( pdAjax.ajaxurl,
			{
				action : 'pd_all_items',
				customDeleteNonce : pdAjax.customDeleteNonce
			}).done(function(data) {
				$( '.media-grid li' ).remove();
				$( '.media-grid' ).append( data );
				wpMediaGrid.changeThumbSize( $( '.thumbnail-size input' ).val() );
				wpMediaGrid.totalCount();
				wpMediaGrid.viewCount();
				overlay.remove();
				//revert .more-media link back to href=1
				$('.more-media').removeClass('loading').attr('href', '1');
				//tell search box that we are back to initial search
				mySearch = true;
				//only if we are doing a live search
				if($('.dashicons-visibility').hasClass('active')) {
					wpMediaGrid.initLiveSearch();
				}
			}).fail(function(response) {
				alert("We're sorry but there seems to be something wrong with the server. Please try again later.");
				overlay.remove();
			});
		},
		
		//Disable media library when sending ajax requests
		disableMedia: function(dM) {
			if(dM) {
				$('#media-grid-search').css({opacity: 0.2});
				$('#media-grid-search').autocomplete('disable');
				//disable search options
				$('#media-library').off('click', '.dashicons-tag',wpMediaGrid.tagSearchIcon);
				$('#media-library').off('click', '.dashicons-search', wpMediaGrid.tagSearchIcon);
				$('#media-library').off('click', '.dashicons-visibility', wpMediaGrid.tagSearchIcon);
				//now check-all box
				$('.media-select-all').off('click', 'input[type=checkbox]',wpMediaGrid.toggleSelectAll);
				$('#media-grid-search').activity({segments: 8, width: 2, space: 0, length: 3, color: '#d54e21', speed: 1.5, align: 'right', outside: 'true'});
			}else{
				$('#media-grid-search').css({opacity: 1.0});
				$('#media-grid-search').autocomplete('enable');
				$('#media-library').on('click', '.dashicons-tag',wpMediaGrid.tagSearchIcon);
				$('#media-library').on('click', '.dashicons-search', wpMediaGrid.tagSearchIcon);
				$('#media-library').on('click', '.dashicons-visibility', wpMediaGrid.tagSearchIcon);
				$('.media-select-all').on('click', 'input[type=checkbox]',wpMediaGrid.toggleSelectAll);
				$('#media-grid-search').activity(false);
			}
		}
	}

	$(document).ready(function($){ wpMediaGrid.init(); });
})(jQuery);