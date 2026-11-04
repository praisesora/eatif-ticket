from PIL import Image

# Open both images
im_target = Image.open('C:/Users/sosor/.gemini/antigravity/brain/ce8d7f31-e372-4a6d-98d7-222ca3aef33b/.user_uploaded/media_1793753191606_33b97e5f.png').convert('RGB')
im_our = Image.open('ticket_verified_parametric.png').convert('RGB')

# Target crop: from y=0 to 450, x=0 to 1024
crop_target = im_target.crop((0, 0, 1024, 450))
# Resize target to match width 430
target_scaled = crop_target.resize((430, int(450 * 430 / 1024)), Image.Resampling.LANCZOS)

# Our crop: from y=0 to target_scaled.height
crop_our = im_our.crop((0, 0, 430, target_scaled.height))

# Combine side by side
comparison = Image.new('RGB', (430 * 2 + 10, target_scaled.height), (200, 200, 200))
comparison.paste(crop_our, (0, 0))
comparison.paste(target_scaled, (430 + 10, 0))
comparison.save('side_by_side_comparison.png')
print('side_by_side_comparison.png saved!')
