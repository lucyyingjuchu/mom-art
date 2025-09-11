# upload_single.py
from Finerworks_processor_aws import HybridFinerWorksProcessor
import os


processor = HybridFinerWorksProcessor()

# Upload your first artwork
base_path = r"C:\Users\paral\Documents\AdditionalFilesforMom-artSite\Original_image_collection"

artwork_id = "019891b0-f39c-7a31-8759-95a350b1e45b"
file_ext=".jpg"

local_file = os.path.join(base_path, artwork_id + file_ext)
print(local_file)

success = processor.upload_to_s3(local_file, artwork_id)
if success:
    print("Upload successful! You can now run the processor to see it marked as print-ready.")