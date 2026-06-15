import os
from uuid import uuid4

from django.db import models
from ckeditor.fields import RichTextField


class JobLocation(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'home_joblocation'

    def __str__(self):
        return self.name


class JobRole(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'home_jobrole'

    def __str__(self):
        return self.name


class Department(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'home_department'

    def __str__(self):
        return self.name


class EmploymentStatus(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'home_employmentstatus'

    def __str__(self):
        return self.name


class Job(models.Model):
    title = models.CharField(max_length=200)
    description = RichTextField()
    location = models.ForeignKey(JobLocation, on_delete=models.CASCADE)
    role = models.ForeignKey(JobRole, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    employment_status = models.ForeignKey(EmploymentStatus, on_delete=models.CASCADE)
    reference_number = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'home_job'

    def __str__(self):
        return self.title


def cv_file_path(instance, filename):
    ext = filename.split('.')[-1]
    name = '.'.join(filename.split('.')[:-1])
    new_filename = f"{name}_{uuid4().hex[:8]}.{ext}"
    return os.path.join('uploads', 'cvs', new_filename)


class JobApplication(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, null=True, blank=True)
    full_name = models.CharField(max_length=255, default='')
    email = models.EmailField(default='')
    phone_number = models.CharField(max_length=20, default='')
    portfolio_link = models.URLField(max_length=500, blank=True, null=True)
    cv_file = models.FileField(upload_to=cv_file_path)
    message = models.TextField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'home_jobapplication'

    def __str__(self):
        return f"Application for {self.job.title if self.job else 'General'} - {self.created_at.strftime('%Y-%m-%d')}"

# Create your models here.
