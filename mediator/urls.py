from django.conf.urls import patterns, include, url

urlpatterns = patterns('',
    url(r'^home/$', 'mediator.views.home', name='home'),
)