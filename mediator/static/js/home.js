/**
 * Intermedior app
 */
var mediator = {
	GOOGLE_SEARCH_URL : "https://www.googleapis.com/youtube/v3/search",
	GOOGLE_VIDEOS_URL : "https://www.googleapis.com/youtube/v3/videos",
	YOUTUBE_VIDEO_URL : "http://www.youtube.com/watch",
	GOOGLE_API_KEY : null,
	results_per_category : 5,
	categories : null,
	catgs : [],
	
	startup : function() {
		mediator.bind_variables();
		mediator.bind_events();
	},
	bind_variables : function() {
		mediator.GOOGLE_API_KEY = $('#GOOGLE_API_KEY').val();
		mediator.catgs = ["youtube"];
		mediator.categories = {
			youtube : mediator.find_youtube_videos,
		};
	},
	bind_events : function() {
		$('#md_search_btn').bind("click", mediator.search_api);
		$('#md_search_field').bind("keypress", mediator.search_api);
	},
	search_api : function(event) {
		if ($(this).attr("id") !== "md_search_field" || event.which === 13) {
			var search_value = $.trim($("#md_search_field").val());
			if (search_value !== "") {
				$('#md_search_area').hide();
				$('#md_search_no_results').hide();
				mediator.process_categories(mediator.catgs, search_value, 0, 0);
			}
		}
	},
	process_categories : function(catgs, search_value, index, num_results) {
		var category = catgs[index];
		var def = mediator.categories[category](search_value);
		def.done(function(results) {
			num_results+= results;
			index++;
			if (index === catgs.length) {
				if (num_results > 0) {
					$('#md_search_area').show();
				} else {
					$('#md_search_no_results').show();
				}
			} else {
				process_categories(catgs, search_value, index, num_results);
			}
		});
	},
	find_youtube_videos : function(search_value) {
		var category = $('.md_search_category[data-category_value="youtube"]');
		var sample_value = $('#youtube_sample');
		category.find('.md_search_value').not(sample_value).empty();
		var num_results = 0;
		var def = $.Deferred();
		
		var search_url = mediator.GOOGLE_SEARCH_URL + "?";
		search_url+= "callback=?";
		search_url+= "&key=" + mediator.GOOGLE_API_KEY;
		search_url+= "&maxResults=" + mediator.results_per_category;
		search_url+= "&part=snippet";
		search_url+= "&q=" + search_value;
		
		$.getJSON(search_url, function(response) {
			if (response.error) {
				def.resolve(num_results);
			} else {
				if (response.items.length === 0) {
					category.hide();
				} else {
					var video_ids = [];
					for (var i = 0; i < response.items.length; i++) {
						if (response.items[i].id.videoId !== undefined) {
							video_ids.push(response.items[i].id.videoId);
						}
					}
					video_ids = video_ids.join(",");
					
					var videos_url = mediator.GOOGLE_VIDEOS_URL + "?";
					videos_url+= "callback=?";
					videos_url+= "&key=" + mediator.GOOGLE_API_KEY;
					videos_url+= "&part=snippet,statistics";
					videos_url+= "&id=" + video_ids;
					
					$.getJSON(videos_url, function(response) {
						if (!response.error) {
							var parent = category.find(".md_search_values");
							for (var i = 0; i < response.items.length; i++) {
								num_results++;
								var dom = sample_value.clone().removeAttr("id");
								var item = response.items[i];
								var link = mediator.YOUTUBE_VIDEO_URL + "?v=" + item.id;
								dom.find(".youtube_thumbnail").attr("src", item.snippet.thumbnails["default"].url);
								dom.find(".youtube_title").html(item.snippet.title);
								dom.find(".youtube_channel").html(item.snippet.channelTitle);
								dom.find(".youtube_views").html(item.statistics.viewCount);
								dom.find(".youtube_link").attr("href", link).html(link);
								parent.append(dom.show());
							}
							category.show();
						}
						def.resolve(num_results);
					});
				}
			}
		});
		return def;
	}
};

mediator.startup();
