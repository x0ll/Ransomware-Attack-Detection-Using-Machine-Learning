import qrcode
from qrcode.image.styled_gui import StyledPilImage

# رابط الموقع الخاص بك (الموجود في الصور)
url = "https://ransomware-attack-detection-using-m.vercel.app/dashboard"

# إعداد كائن الـ QR
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H, # تصحيح خطأ عالٍ ليتحمل إضافة شعار
    box_size=10,
    border=4,
)

qr.add_data(url)
qr.make(fit=True)

# توليد الصورة بالألوان المخصصة (أخضر على خلفية سوداء)
img = qr.make_image(fill_color="#18c420", back_color="#000000")

# حفظ الصورة
img.save("RansomGuard_QR.png")