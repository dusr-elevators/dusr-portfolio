from django.shortcuts import render, get_object_or_404
from pages.models import (
    Category,
    PortfolioItem,
    ProductCategory,
    Product,
    HeroImage,
    TermsOfService,
    PrivacyPolicy,
    Newsletter,
    SiteConfig,
)
from jobs.models import Job, JobLocation, JobRole, Department, EmploymentStatus, JobApplication
from media_app.models import CarouselSlide, HomeVideo
from news.models import NewsItem
from gallery.models import GalleryPhoto
from django.http import JsonResponse
from django.db.models import Q
import os
from django.utils.translation import gettext as _
from django.core.validators import validate_email
from django.core.exceptions import ValidationError


def get_subcategories(request, category_id):
    try:
        print(f"Fetching subcategories for category ID: {category_id}")  # Debug print
        parent_category = ProductCategory.objects.get(id=category_id)
        
        # Get all main category types by traversing up all parent hierarchies
        main_types = parent_category.get_main_category_types()
        
        # Get subcategories (children) through the many-to-many relationship
        subcategories = ProductCategory.objects.filter(
            parents=parent_category,
            is_active=True
        ).order_by('order')
        
        print(f"Found {subcategories.count()} subcategories")  # Debug print
        
        data = [{
            'id': sub.id,
            'name': sub.name,
            'filter_class': sub.filter_class,
            'has_children': ProductCategory.objects.filter(parents=sub, is_active=True).exists(),
            'level': sub.level,
            'main_types': main_types
        } for sub in subcategories]
        
        print(f"Returning data: {data}")  # Debug print
        return JsonResponse({'subcategories': data})
    except ProductCategory.DoesNotExist:
        print(f"Category {category_id} not found")  # Debug print
        return JsonResponse({'error': f'Category {category_id} not found'}, status=404)
    except Exception as e:
        print(f"Error: {str(e)}")  # Debug print
        return JsonResponse({'error': str(e)}, status=500)

def portfolio(request):
    # Fetch all categories and portfolio items
    categories = Category.objects.all()
    portfolio_items = PortfolioItem.objects.all()

    context = {
        'categories': categories,
        'portfolio_items': portfolio_items,
    }
    return render(request, 'portfolio.html', context)

def get_portfolio_items(request, category_slug):
    category = Category.objects.get(slug=category_slug)
    portfolio_items = PortfolioItem.objects.filter(category=category)
    
    items_data = [
        {
            'title': item.title,
            'description': item.description,
            'image': item.image.url,
            'link': item.link,
        }
        for item in portfolio_items
    ]
    return JsonResponse({'items': items_data})

def index(request):
    # Get active carousel slides in order
    carousel_slides = CarouselSlide.objects.filter(is_active=True).order_by('order')
    # Get the latest 6 jobs for the carousel
    latest_jobs = Job.objects.all()[:6]
    # Get active video for all templates (desktop, mobile, tablet)
    active_video = HomeVideo.objects.filter(is_active=True).first()
    # Get active news items
    news_items = NewsItem.objects.filter(is_active=True).order_by('order', '-created_at')[:3]
    
    context = {
        'carousel_slides': carousel_slides,
        'jobs': latest_jobs,
        'active_video': active_video,
        'news_items': news_items
    }
    return render(request, 'home/index.html', context)

def about(request):
    # Get hero image for about page
    hero_image = HeroImage.objects.filter(page='about', is_active=True).first()
    return render(request, 'home/whoweare.html', {'hero_image': hero_image})

def heritage(request):
    # Get hero image for heritage page
    hero_image = HeroImage.objects.filter(page='heritage', is_active=True).first()
    return render(request, 'home/heritage.html', {'hero_image': hero_image})

def team(request):
    return render(request, 'home/team.html')

def corporate_governance(request):
    # Get hero image for corporate governance page
    hero_image = HeroImage.objects.filter(page='corporate_governance', is_active=True).first()
    return render(request, 'home/corporate_governance.html', {'hero_image': hero_image})

def vision_mission_values(request):
    # Get hero image for vision, mission & values page
    hero_image = HeroImage.objects.filter(page='vision_mission_values', is_active=True).first()
    return render(request, 'home/vision_mission_values.html', {'hero_image': hero_image})

# Media Pages
def photos_videos(request):
    # Get all active gallery photos
    gallery_photos = GalleryPhoto.objects.filter(is_active=True).order_by('order', '-created_at')
    # Get hero image for photos & videos page
    hero_image = HeroImage.objects.filter(page='photos_videos', is_active=True).first()
    
    context = {
        'gallery_photos': gallery_photos,
        'hero_image': hero_image,
    }
    return render(request, 'home/photos_videos.html', context)

def gallery_photo_related_images(request, photo_id):
    try:
        photo = GalleryPhoto.objects.get(id=photo_id, is_active=True)
        related_images = photo.related_images.all().order_by('order')
        images = [{'url': image.image.url} for image in related_images]
        return JsonResponse({'images': images})
    except GalleryPhoto.DoesNotExist:
        return JsonResponse({'error': 'Photo not found'}, status=404)

def news_insights(request):
    # Get all active news items for the news page
    news_items = NewsItem.objects.filter(is_active=True).order_by('order', '-created_at')
    # Get hero image for news page
    hero_image = HeroImage.objects.filter(page='news', is_active=True).first()
    return render(request, 'home/news_insights.html', {
        'news_items': news_items,
        'hero_image': hero_image
    })

# Commitments Pages
def sustainability(request):
    # Get hero image for sustainability page
    hero_image = HeroImage.objects.filter(page='sustainability', is_active=True).first()
    return render(request, 'home/sustainability.html', {'hero_image': hero_image})

def saudi_vision(request):
    # Get hero image for saudi vision page
    hero_image = HeroImage.objects.filter(page='saudi_vision', is_active=True).first()
    return render(request, 'home/saudi_vision.html', {'hero_image': hero_image})

# Products Pages
def meats(request):
    # Get the selected main category type from the URL parameter
    main_category_type = request.GET.get('category', None)  # Default to None for "All"
    
    # Get main categories (level 0)
    main_categories_query = ProductCategory.objects.filter(
        level=0,
        is_active=True
    )
    
    # If a specific category is selected, filter by it
    if main_category_type and main_category_type != 'all':
        main_categories = main_categories_query.filter(main_category_type=main_category_type)
        
        # Get all products that belong to the selected main category type
        # This includes products in categories with any parent of the specified type
        products = Product.objects.filter(
            is_active=True,  # Add this line to filter out inactive products
            categories__in=ProductCategory.objects.filter(
                Q(main_category_type=main_category_type) |  # Direct level 0 category
                Q(parents__main_category_type=main_category_type) |  # Parent is of the type
                Q(parents__parents__main_category_type=main_category_type) |  # Grandparent is of the type
                Q(parents__parents__parents__main_category_type=main_category_type)  # Great-grandparent is of the type
            ).distinct()
        ).filter(
            categories__is_active=True
        ).distinct()
    else:
        # For "All" category, get all main categories and products
        main_categories = main_categories_query.all()
        products = Product.objects.filter(
            is_active=True,  # Add this line to filter out inactive products
            categories__is_active=True
        ).distinct()
    
    # Order the results
    main_categories = main_categories.order_by('order')
    products = products.prefetch_related(
        'categories',
        'categories__parents',
        'categories__parents__parents',
        'categories__parents__parents__parents'
    ).order_by('order', 'name')
    
    print(f"Found {main_categories.count()} main categories")  # Debug print
    for cat in main_categories:
        print(f"Category: {cat.name} (ID: {cat.id})")  # Debug print
    
    context = {
        'main_categories': main_categories,
        'products': products,
        'selected_category': main_category_type or 'all',
        'catalogue_pdf_url': (SiteConfig.objects.first().catalogue_pdf.url if SiteConfig.objects.exists() and SiteConfig.objects.first().catalogue_pdf else None)
    }
    
    return render(request, 'home/meats.html', context)

def dairy(request):
    return render(request, 'home/dairy.html', )

def vegitablefruits(request):
    return render(request, 'home/vegitable-fruits.html', )

def oils(request):
    return render(request, 'home/oils.html', )

def others(request):
    return render(request, 'home/others.html', )

# Contact Us Pages
def sales(request):
    return render(request, 'home/sales.html')

def contact_info(request):
    # Get hero image for contact info page
    hero_image = HeroImage.objects.filter(page='contact_info', is_active=True).first()
    # Get info section background image - using 'contact' as the page identifier
    info_bg_image = HeroImage.objects.filter(page='contact', is_active=True).first()
    return render(request, 'home/contact_info.html', {
        'hero_image': hero_image,
        'info_bg_image': info_bg_image
    })

def products_filter(request):
    return render(request, 'home/products_filter.html')

def careers(request):
    jobs = Job.objects.all()
    return render(request, 'home/careers.html', {'jobs': jobs})

def jobs(request):
    jobs = Job.objects.all()
    locations = JobLocation.objects.all()
    roles = JobRole.objects.all()
    departments = Department.objects.all()
    employment_statuses = EmploymentStatus.objects.all()

    context = {
        'jobs': jobs,
        'locations': locations,
        'roles': roles,
        'departments': departments,
        'employment_statuses': employment_statuses,
    }
    return render(request, 'home/jobs.html', context)

def job_details(request, job_id):
    job = get_object_or_404(Job, id=job_id)
    return render(request, 'home/job_details.html', {'job': job})

# Branches
def branches(request):
    return render(request, 'home/branches.html')

def vendor(request):
    return render(request, 'home/vendor.html')

def get_all_subcategories(request):
    # Get the current main category type from the query parameter
    main_category_type = request.GET.get('category', 'all')
    
    # Get all level 1 and 2 categories
    subcategories = ProductCategory.objects.filter(
        level__in=[1, 2],
        is_active=True
    ).prefetch_related('parents', 'parents__parents')
    
    # Filter subcategories based on main_category_type if not 'all'
    if main_category_type and main_category_type != 'all':
        subcategories = subcategories.filter(
            Q(parents__main_category_type=main_category_type) |  # Parent is of the type
            Q(parents__parents__main_category_type=main_category_type)  # Grandparent is of the type
        ).distinct()
    
    # Group subcategories by their parent (main category)
    grouped_data = {}
    processed_subcats = set()  # Keep track of processed subcategories
    
    for subcategory in subcategories:
        # Skip if we've already processed this subcategory
        if subcategory.id in processed_subcats:
            continue
            
        # Get all root parents (level 0 categories)
        root_parents = set()  # Use set to avoid duplicate parents
        for parent in subcategory.parents.all():
            if parent.level == 0:
                root_parents.add(parent)
            else:
                root_parents.update([p for p in parent.parents.all() if p.level == 0])
        
        # Choose the most appropriate parent to group under
        chosen_parent = None
        if main_category_type and main_category_type != 'all':
            # If filtering by type, prefer the parent matching that type
            for parent in root_parents:
                if parent.main_category_type == main_category_type:
                    chosen_parent = parent
                    break
        
        if not chosen_parent and root_parents:
            # If no type-matching parent found or no specific type filter,
            # use the first active parent by order
            chosen_parent = min(
                [p for p in root_parents if p.is_active],
                key=lambda x: (x.order, x.id),
                default=None
            )
        
        if chosen_parent and chosen_parent.is_active:
            if chosen_parent.id not in grouped_data:
                grouped_data[chosen_parent.id] = {
                    'id': chosen_parent.id,
                    'name': chosen_parent.name,
                    'filter_class': chosen_parent.filter_class,
                    'main_category_type': chosen_parent.main_category_type,
                    'subcategories': []
                }
            
            if subcategory.level == 1:
                # For level 1 categories, check for level 2 children
                has_children = ProductCategory.objects.filter(
                    parents=subcategory,
                    level=2,
                    is_active=True
                ).exists()
                
                subcat_data = {
                    'id': subcategory.id,
                    'name': subcategory.name,
                    'filter_class': subcategory.filter_class,
                    'has_children': has_children,
                    'level': subcategory.level,
                    'main_types': subcategory.get_main_category_types(),
                    'all_parent_filters': ' '.join(p.filter_class for p in root_parents if p.is_active)
                }
                grouped_data[chosen_parent.id]['subcategories'].append(subcat_data)
                processed_subcats.add(subcategory.id)
    
    # Convert the grouped data to a list
    categories_data = list(grouped_data.values())
    
    return JsonResponse({'categories': categories_data})

def filter_jobs(request):
    jobs = Job.objects.all()
    
    # Search query
    search_query = request.GET.get('search', '')
    if search_query:
        jobs = jobs.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query)
        )
    
    # Location filter
    locations = request.GET.get('locations', '')
    if locations:
        location_ids = [int(id) for id in locations.split(',') if id]
        if location_ids:
            jobs = jobs.filter(location_id__in=location_ids)
    
    # Role filter
    roles = request.GET.get('roles', '')
    if roles:
        role_ids = [int(id) for id in roles.split(',') if id]
        if role_ids:
            jobs = jobs.filter(role_id__in=role_ids)
    
    # Department filter
    departments = request.GET.get('departments', '')
    if departments:
        department_ids = [int(id) for id in departments.split(',') if id]
        if department_ids:
            jobs = jobs.filter(department_id__in=department_ids)
    
    # Employment status filter
    employment_statuses = request.GET.get('employment_statuses', '')
    if employment_statuses:
        status_ids = [int(id) for id in employment_statuses.split(',') if id]
        if status_ids:
            jobs = jobs.filter(employment_status_id__in=status_ids)
    
    # Prepare the response data
    jobs_data = [{
        'id': job.id,
        'title': job.title,
        'location': str(job.location),
        'role': str(job.role),
        'department': str(job.department),
        'employment_status': str(job.employment_status)
    } for job in jobs]
    
    return JsonResponse({'jobs': jobs_data})

def upload_cv(request):
    if request.method == 'POST':
        try:
            cv_file = request.FILES.get('cv')
            message = request.POST.get('message', '')
            
            # Validate file type
            if not cv_file.name.endswith('.pdf'):
                return JsonResponse({'error': 'Only PDF files are allowed'}, status=400)
            
            # Validate file size (5MB)
            if cv_file.size > 5 * 1024 * 1024:
                return JsonResponse({'error': 'File size must be less than 5MB'}, status=400)
            
            # Create job application
            application = JobApplication.objects.create(
                cv_file=cv_file,
                message=message
            )
            
            return JsonResponse({'message': 'CV uploaded successfully'})
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=405)

def terms_of_service(request):
    terms = get_object_or_404(TermsOfService)
    return render(request, 'home/terms_of_service.html', {'terms': terms})

def privacy_policy(request):
    privacy = get_object_or_404(PrivacyPolicy)
    return render(request, 'home/privacy_policy.html', {'privacy': privacy})

def subscribe_newsletter(request):
    if request.method == 'POST':
        try:
            email = request.POST.get('email', '').strip()
            
            # Validate email
            validate_email(email)
            
            # Check if email already exists
            if not Newsletter.objects.filter(email=email).exists():
                # Create new subscription only if email doesn't exist
                Newsletter.objects.create(email=email)
            
            # Always return success
            return JsonResponse({
                'status': 'success',
                'message': _('Thank you for subscribing to our newsletter!')
            })
            
        except ValidationError:
            return JsonResponse({
                'status': 'error',
                'message': _('Please enter a valid email address.')
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': _('An error occurred. Please try again later.')
            })
    
    return JsonResponse({
        'status': 'error',
        'message': _('Invalid request method.')
    })