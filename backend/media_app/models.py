from django.db import models
from django.core.validators import FileExtensionValidator


class CarouselSlide(models.Model):
    title = models.CharField(max_length=200, help_text="For admin reference only")
    desktop_image = models.ImageField(upload_to='carousel/desktop/', help_text="Desktop version of the slide (1920x1080 recommended)", blank=True, null=True)
    mobile_image = models.ImageField(upload_to='carousel/mobile/', help_text="Mobile version of the slide (768x1024 recommended)", blank=True, null=True)
    ar_desktop_image = models.ImageField(upload_to='carousel/desktop/ar/', help_text="Arabic desktop version of the slide (1920x1080 recommended)", blank=True, null=True)
    ar_mobile_image = models.ImageField(upload_to='carousel/mobile/ar/', help_text="Arabic mobile version of the slide (768x1024 recommended)", blank=True, null=True)
    order = models.IntegerField(default=0, help_text="Order of appearance in the carousel")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = 'Carousel Slide'
        verbose_name_plural = 'Carousel Slides'
        db_table = 'home_carouselslide'

    def __str__(self):
        return self.title


class HomeVideo(models.Model):
    title = models.CharField(max_length=200, help_text="For admin reference only")
    video_file = models.FileField(
        upload_to='videos/',
        help_text="Upload MP4 video file",
        validators=[FileExtensionValidator(['mp4'])]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Home Video'
        verbose_name_plural = 'Home Video'
        db_table = 'home_homevideo'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.is_active:
            HomeVideo.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

# Create your models here.
