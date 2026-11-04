from PIL import Image

im = Image.open('ticket_after_edit1.png')
# Crop the logo area: around x=200..300, y=50..90
crop = im.crop((200, 48, 300, 95))
# Scale up 4x with nearest neighbor so we can inspect pixels cleanly
crop_4x = crop.resize((crop.size[0] * 4, crop.size[1] * 4), Image.NEAREST)
crop_4x.save('logo_magnified.png')
print('logo_magnified.png saved, size:', crop_4x.size)
