/**
 * Intermedior app
 */
var mediator = {
	GOOGLE_SEARCH_URL : "https://www.googleapis.com/youtube/v3/search",
	GOOGLE_VIDEOS_URL : "https://www.googleapis.com/youtube/v3/videos",
	YOUTUBE_VIDEO_URL : "http://www.youtube.com/watch",
	GOOGLE_API_KEY : null,
	youtube_results : 50,
	youtube_top_results : 5,
	tumblr_results : 50,
	tumblr_top_results : 3,
	categories : null,
	catgs : [],
	youtube_filter_views : false,
	youtube_filter_views_c : 1000000,
	youtube_filter_pressed : false,
	search_string : null,
	request_sent : false,
	default_image_count : 1,
	default_image_number : 3,
	default_image_timeout : 3000,
	default_image_on : true,
	
	startup : function() {
		mediator.bind_variables();
		mediator.bind_events();
		mediator.set_default_image();
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
	set_default_image : function() {
		if (mediator.default_image_on) {
			window.setTimeout(function() {
				mediator.default_image_count = mediator.default_image_count % mediator.default_image_number + 1;
				$('#md_default_image').attr("src", "/static/img/search_image" + mediator.default_image_count + ".png");
				mediator.set_default_image();
			}, mediator.default_image_timeout);
		}
	},
	search_api : function(event) {
		if (mediator.request_sent) {
			return;
		}
		if ($(this).attr("id") !== "md_search_field" || event.which === 13) {
			mediator.default_image_on = false;
			var search_value = $.trim($("#md_search_field").val());
			if (search_value !== "") {
				mediator.search_string = search_value;
				mediator.youtube_filter_pressed = false;
				mediator.youtube_filter_views = false;
				mediator.request_sent = true;
				$('#md_filter_views').attr("checked", false);
				$('#md_search_results').hide();
				$('#md_search_no_results').hide();
				$('#md_best_fit').hide();
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
			if (num_results > 0) {
				$('#md_default_area').hide();
				$('#md_search_results').show();
				$('#md_search_area').show();
				$('#md_best_fit').show();
			}
			if (index === catgs.length) {
				if (num_results === 0) {
					$('#md_default_area').hide();
					$('#md_search_no_results').show();
					$('#md_search_area').show();
				}
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
		$('#youtube_top_results').empty();
		var num_results = 0;
		var def = $.Deferred();
		
		var search_url = mediator.GOOGLE_SEARCH_URL + "?";
		search_url+= "callback=?";
		search_url+= "&key=" + mediator.GOOGLE_API_KEY;
		search_url+= "&maxResults=" + mediator.youtube_results;
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
							var parent = category.find(".md_results");
							var top_items = [];
							for (var i = 0; i < response.items.length; i++) {
								var item = response.items[i];
								if (!mediator.youtube_filter_views || item.statistics.viewCount > mediator.youtube_filter_views_c) {
									var connected = Math.floor(Math.random() * 2);
									if (connected) {
										top_items.push(item);
									}
									var dom = mediator.youtube_result(item, connected);
									parent.append(dom.show());
									num_results++;
								}
							}
							top_items.sort(function(item1, item2) {
								var count1 = Math.floor(item1.statistics.viewCount);
								var count2 = Math.floor(item2.statistics.viewCount);
								return (count1 < count2) ? 1 : (count2 < count1) ? -1 : 0;
							});
							top_items.splice(mediator.youtube_top_results);
							var parent = $('#youtube_top_results');
							for (var i = 0; i < top_items.length; i++) {
								var item = top_items[i];
								var dom = mediator.youtube_result(item, true);
								dom.find(".md_thumnail").removeClass("col-md-2").addClass("col-md-4");
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
	},
	youtube_result : function(item, connected) {
		var sample_value = $('#youtube_sample');
		var dom = sample_value.clone().removeAttr("id");
		var link = mediator.YOUTUBE_VIDEO_URL + "?v=" + item.id;
		dom.find(".youtube_thumbnail").attr("src", item.snippet.thumbnails["default"].url);
		dom.find(".youtube_title").html(item.snippet.title);
		dom.find(".youtube_channel").html(item.snippet.channelTitle);
		dom.find(".youtube_views").html(item.statistics.viewCount);
		if (connected) {
			dom.find(".youtube_link_parent").show();
			dom.find(".youtube_link").attr("href", link).html(link);
			dom.find(".connected_txt, .connected_btn").show();
		} else {
			dom.find(".not_connected_txt, .not_connected_btn").show();
		}
		return dom;
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
		$('#tumblr_top_results').empty();
		var def = $.Deferred();
		var num_results = 0;
		
		$.ajax({
			url: $('#md_container').attr("data-tumblr_url"),
			type: "GET",
			dataType: "json",
			data: {"search_tag" : search_value, "results" : mediator.tumblr_results},
			success: function(res) {
				if (res.length === 0) {
					category.hide();
				} else {
					var parent = category.find(".md_results");
					var top_items = [];
					for (var i = 0; i < res.length; i++) {
						var item = res[i];
						var followers = Math.floor(Math.random() * 40000) + 10000;
						var connected = Math.floor(Math.random()*4);
						if (connected) {
							top_items.push(item);
							item.followers = followers;
						}
						var dom = mediator.tumblr_result(item, connected, followers);
						parent.append(dom.show());
						num_results++;
					}
					top_items.sort(function(item1, item2) {
						var count1 = Math.floor(item1.followers);
						var count2 = Math.floor(item2.followers);
						return (count1 < count2) ? 1 : (count2 < count1) ? -1 : 0;
					});
					top_items.splice(mediator.tumblr_top_results);
					var parent = $('#tumblr_top_results');
					for (var i = 0; i < top_items.length; i++) {
						var item = top_items[i];
						var dom = mediator.tumblr_result(item, true, item.followers);
						dom.find(".tumblr_thumbnail").css({"width" : "120px", "height" : "90px"}).parent().removeClass("col-md-2").addClass("col-md-4");
						parent.append(dom.show());
					}
					category.show();
				}
				def.resolve(num_results);
			}
		});
		return def;
	},
	tumblr_result : function(item, connected, followers) {
		var sample_value = $('#tumblr_sample');
		var dom = sample_value.clone().removeAttr("id");
		dom.find(".tumblr_thumbnail").attr("src", item.thumbnail);
		dom.find(".tumblr_name").html(item.blog_name);
		dom.find(".tumblr_followers").html(followers);
		if (connected) {
			dom.find(".tumblr_link_parent").show();
			dom.find(".tumblr_link").attr("href", item.link).html(item.link);
			dom.find(".connected_txt, .connected_btn").show();
		} else {
			dom.find(".not_connected_txt, .not_connected_btn").show();
		}
		return dom;
	},
};

mediator.startup();
