wp-media-grid-view
==================

A grid view for the WordPress media library.

Clicking on image takes you to a modal window where you can view a larger image as well as detailed information about the image.

Selecting multiple images presents options to delete selected.  

Search box has 3 icons along the top that enable different search options.  From left to right they are:

1. Standard wordpress search on all images (not working yet!)
2. Search by media tags.  Must have a seperate media tagging plugin (or register your own custom taxonomy and terms) activated.  So far the following list of plugins are known to work.
    - Media Tags by Paul Menard
    - Enhanced Media Library
3. Live Search of viewable items.  Just start typing and it will search all available media details such as title, file name, tags and categories.

**Note** - Media Library Assistant is not fully supported as of yet as that plugin doesn't update their terms count in the database if images aren't attached to posts so it is difficult to return a full list of terms to search on.  If all your images are attached to posts than you should be fine.  Hopefully at some point there will be a fix for this as this plugin is really nice.

**Hints**
==================

- clearing the search box and hitting enter returns the search back to original
- the numbers under search box indicate total available images for the current search.  Originally this is all images. Viewable are the number of images available for Live Search.
- Infinite scroll is enabled so scrolling down the page loads more images as long as they are available in the search.
- If total items count is more than viewable, clicking on total count loads all images.

**ToDo**
==================

*  Add the standard wordpress search to the search box
*  Enable bulk tagging of media items
*  Better grid - tighter spacing and less junk on mouseover
*  Different layouts - by date, tags, type, ?
