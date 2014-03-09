/**
 * Intermedior app
 */
var mediator = {
	GOOGLE_SEARCH_URL : "https://www.googleapis.com/youtube/v3/search",
	GOOGLE_VIDEOS_URL : "https://www.googleapis.com/youtube/v3/videos",
	YOUTUBE_VIDEO_URL : "http://www.youtube.com/watch",
	GOOGLE_API_KEY : null,
	results_per_category : 50,
	tumblr_results : 50,
	categories : null,
	catgs : [],
	youtube_filter_views : false,
	youtube_filter_views_c : 1000000,
	youtube_filter_pressed : false,
	search_string : null,
	request_sent : false,
	
	startup : function() {
		mediator.bind_variables();
		mediator.bind_events();
	},
	bind_variables : function() {
		mediator.GOOGLE_API_KEY = $('#GOOGLE_API_KEY').val();
		mediator.catgs = ["youtube", "tumblr"];
		mediator.categories = {
			youtube : mediator.find_youtube_videos,
			tumblr : mediator.find_tumblr_posts,
		};
	},
	bind_events : function() {
		$('#md_search_btn').bind("click", mediator.search_api);
		$('#md_search_field').bind("keypress", mediator.search_api);
		$('#md_filter_views').bind("change", mediator.views_filter_pressed);
	},
	search_api : function(event) {
		if (mediator.request_sent) {
			return;
		}
		if ($(this).attr("id") !== "md_search_field" || event.which === 13) {
			var search_value = $.trim($("#md_search_field").val());
			if (search_value !== "") {
				mediator.search_string = search_value;
				mediator.youtube_filter_pressed = false;
				mediator.youtube_filter_views = false;
				mediator.request_sent = true;
				$('#md_filter_views').attr("checked", false);
				$('#md_search_results').hide();
				$('#md_search_no_results').hide();
				mediator.process_categories(mediator.catgs, 0, 0);
			}
		}
	},
	process_categories : function(catgs, index, num_results) {
		var category = catgs[index];
		var def = mediator.categories[category](mediator.search_string);
		def.done(function(results) {
			num_results+= results;
			index++;
			if (index === catgs.length) {
				if (num_results > 0) {
					$('#md_search_results').show();
				} else {
					$('#md_search_no_results').show();
				}
				$('#md_search_area').show();
				mediator.request_sent = false;
			} else {
				mediator.process_categories(catgs, index, num_results);
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
		search_url+= "&order=" + (mediator.youtube_filter_views ? "viewCount" : "relevance");
		search_url+= "&type=video";
		
		$.getJSON(search_url, function(response) {
			if (response.error) {
				def.resolve(num_results);
			} else {
				if (response.items.length === 0 && !mediator.youtube_filter_pressed) {
					category.hide();
					def.resolve(num_results);
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
								var item = response.items[i];
								if (!mediator.youtube_filter_views || item.statistics.viewCount > mediator.youtube_filter_views_c) {
									num_results++;
									var dom = sample_value.clone().removeAttr("id");
									var link = mediator.YOUTUBE_VIDEO_URL + "?v=" + item.id;
									dom.find(".youtube_thumbnail").attr("src", item.snippet.thumbnails["default"].url);
									dom.find(".youtube_title").html(item.snippet.title);
									dom.find(".youtube_channel").html(item.snippet.channelTitle);
									dom.find(".youtube_views").html(item.statistics.viewCount);
									var connected = Math.floor(Math.random() * 2);
									if (connected) {
										dom.find(".youtube_link_parent").show();
										dom.find(".youtube_link").attr("href", link).html(link);
										dom.find(".connected_txt, .connected_btn").show();
									} else {
										dom.find(".not_connected_txt, .not_connected_btn").show();
									}
									parent.append(dom.show());
								}
							}
							category.show();
						}
						def.resolve(num_results);
					});
				}
			}
		});
		return def;
	},
	views_filter_pressed : function(event) {
		if (mediator.request_sent) {
			return;
		}
		mediator.youtube_filter_views = (this.checked === true);
		mediator.youtube_filter_pressed = true;
		mediator.request_sent = true;
		mediator.categories["youtube"](mediator.search_string).done(function() {
			mediator.request_sent = false;
		});
	},
	find_tumblr_posts : function(search_value) {
		var category = $('.md_search_category[data-category_value="tumblr"]');
		var sample_value = $('#tumblr_sample');
		category.find('.md_search_value').not(sample_value).empty();
		var def = $.Deferred();
		var num_results = 0;
		
		$.ajax({
			url: $('#md_container').attr("data-tumblr_url"),
			type: "GET",
			dataType: "json",
			data: {"search_tag" : search_value, "results" : mediator.tumblr_results},
			success: function(res) {
				console.log(res);
				if (res.length === 0) {
					category.hide();
				} else {
					var parent = category.find(".md_search_values");
					for (var i = 0; i < res.length; i++) {
						var item = res[i];
						num_results++;
						var dom = sample_value.clone().removeAttr("id");
						dom.find(".tumblr_thumbnail").attr("src", item.thumbnail);
						dom.find(".tumblr_name").html(item.blog_name);
						var followers = Math.floor(Math.random() * 40000) + 10000;
						dom.find(".tumblr_followers").html(followers);
						var connected = Math.floor(Math.random()*4);
						if (connected) {
							dom.find(".tumblr_link_parent").show();
							dom.find(".tumblr_link").attr("href", item.link).html(item.link);
							dom.find(".connected_txt, .connected_btn").show();
						} else {
							dom.find(".not_connected_txt, .not_connected_btn").show();
						}
						parent.append(dom.show());
					}
					category.show();
				}
				def.resolve(num_results);
			}
		});
		return def;
	}
};

mediator.startup();
