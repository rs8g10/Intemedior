from django.conf.urls import patterns, include, url

urlpatterns = patterns('',
    url(r'^home/$', 'mediator.views.home', name='home'),
    url(r'^tumblr_posts/$', 'mediator.views.tumblr_posts', name='tumblr_posts'),
)