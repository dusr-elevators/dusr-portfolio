from django.urls import path
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    path('', views.index, name='home'),
    path('media', RedirectView.as_view(url='/photos-videos/', permanent=True)),
    path('media/', RedirectView.as_view(url='/photos-videos/', permanent=True)),
    path('job-details', RedirectView.as_view(url='/jobs/', permanent=True)),
    path('job-details/', RedirectView.as_view(url='/jobs/', permanent=True)),
    path('job-details/<path:path>', RedirectView.as_view(url='/jobs/', permanent=True)),
    path('our-products/', RedirectView.as_view(url='/meats/', permanent=True), name='old-products-redirect'),
    path('whoweare/', views.about, name='about'),
    path('heritage/', views.heritage, name='heritage'),
    path('team/', views.team, name='team'),
    path('corporate-governance/', views.corporate_governance, name='corporate-governance'),
    path('vision-mission-values/', views.vision_mission_values, name='vision-mission-values'),

    # Media Pages
    path('photos-videos/', views.photos_videos, name='photos-videos'),
    path('api/gallery-photos/<int:photo_id>/related-images/', views.gallery_photo_related_images, name='gallery-photo-related-images'),
    path('news-insights/', views.news_insights, name='news-insights'),

    # Commitments Pages
    path('sustainability/', views.sustainability, name='sustainability'),
    path('saudi-vision/', views.saudi_vision, name='saudi-vision'),

    # Products Pages
    path('meats/', views.meats, name='meats'),
    path('dairy/', views.dairy, name='dairy'),
    path('vegitable-fruits/', views.vegitablefruits, name='vegitable-fruits'),
    path('oils/', views.oils, name='oils'),
    path('others/', views.others, name='others'),

    # path('portfolio/', views.portfolio, name='portfolio'),
    # path('get_portfolio_items/<slug:category_slug>/', views.get_portfolio_items, name='get_portfolio_items'),
    path('get_subcategories/<int:category_id>/', views.get_subcategories, name='get_subcategories'),
    path('get_all_subcategories/', views.get_all_subcategories, name='get_all_subcategories'),
    # path('products_/', views.products, name='products_all'),
    
    # Contact Us Dropdown Pages
    path('sales/', views.sales, name='sales'),
    path('info/', views.contact_info, name='contact-info'),
    path('filter/', views.products_filter, name='products_filter'),

    # Careers
    path('careers/', views.careers, name='careers'),
    path('jobs/', views.jobs, name='jobs'),
    path('job/<int:job_id>/', views.job_details, name='job_details'),
    path('filter-jobs/', views.filter_jobs, name='filter_jobs'),
    path('upload_cv/', views.upload_cv, name='upload_cv'),
    
    # Branches
    path('branches/', views.branches, name='branches'),
    
    # Vendor
    path('vendor/', views.vendor, name='vendor'),

    path('terms-of-service/', views.terms_of_service, name='terms-of-service'),
    path('privacy-policy/', views.privacy_policy, name='privacy-policy'),

    path('subscribe-newsletter/', views.subscribe_newsletter, name='subscribe-newsletter'),
]
