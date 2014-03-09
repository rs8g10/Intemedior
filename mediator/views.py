from django.shortcuts import render_to_response
from django.conf import settings;
import json
import pytumblr
from django.http import HttpResponse

def home(request):
    if request.method == "GET":
        return render_to_response('home.html', {"GOOGLE_API_KEY": settings.GOOGLE_API_KEY})

def tumblr_posts(request):
    if request.method == "GET":
        client = pytumblr.TumblrRestClient(
                                           settings.TUMBLR_CONSUMER_KEY,
                                           settings.TUMBLR_CONSUMER_SECRET,
                                           settings.TUMBLR_OAUTH_TOKEN,
                                           settings.TUMBLR_OAUTH_SECRET)
        posts = client.tagged(request.GET["search_tag"], limit=int(request.GET["results"]))
        response = []
        for post in posts:
            if post["type"] == "photo":
                post_ob = {}
                post_ob["blog_name"] = post["blog_name"]
                post_ob["thumbnail"] = post["photos"][0]["original_size"]["url"]
                post_ob["link"] = post["post_url"]
                response.append(post_ob)
            
        return HttpResponse(json.dumps(response), content_type="application/json")
