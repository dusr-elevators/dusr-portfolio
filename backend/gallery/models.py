from django.db import models


class GalleryPhoto(models.Model):
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=500)
    date = models.DateField(null=True, blank=True)
    image = models.ImageField(upload_to='gallery/', help_text="Main image (800x600px recommended)")
    order = models.IntegerField(default=0, help_text="Order of appearance in the gallery")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = 'Gallery Photo'
        verbose_name_plural = 'Gallery Photos'
        db_table = 'home_galleryphoto'

    def __str__(self):
        return self.title


class GalleryPhotoImage(models.Model):
    gallery_photo = models.ForeignKey(GalleryPhoto, related_name='related_images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='gallery/related/', help_text="Related image (800x600px recommended)")
    order = models.IntegerField(default=0, help_text="Order of appearance in the slider")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = 'Related Gallery Image'
        verbose_name_plural = 'Related Gallery Images'
        db_table = 'home_galleryphotoimage'

    def __str__(self):
        return f"Related image for {self.gallery_photo.title}"

# Create your models here.
