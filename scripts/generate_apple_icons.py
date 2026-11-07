import os
import shutil
import hashlib
import numpy as np
from PIL import Image, ImageDraw

def generate_apple_squircle_mask(size, corner_radius_ratio=0.2237, corner_smoothing=0.6, supersample=8):
    W = size * supersample
    H = size * supersample
    r = W * corner_radius_ratio
    
    p = (1 + corner_smoothing) * r
    max_budget = min(W, H) / 2
    if p > max_budget:
        corner_smoothing = max_budget / r - 1
        p = max_budget
        
    arc_measure = 90 * (1 - corner_smoothing)
    arc_section_length = np.sin(np.radians(arc_measure / 2)) * r * np.sqrt(2)
    angle_alpha = (90 - arc_measure) / 2
    p3_to_p4 = r * np.tan(np.radians(angle_alpha / 2))
    angle_beta = np.radians(45 * corner_smoothing)
    c = p3_to_p4 * np.cos(angle_beta)
    d = c * np.tan(angle_beta)
    b = (p - arc_section_length - c - d) / 3
    a = 2 * b
    
    def cubic_bezier(p0, p1, p2, p3, n=60):
        t = np.linspace(0, 1, n).reshape(-1, 1)
        return (1-t)**3 * p0 + 3*(1-t)**2*t * p1 + 3*(1-t)*t**2 * p2 + t**3 * p3

    cx, cy = W / 2, H / 2
    pts = [np.array([cx, 0.0])]
    if (W - p) > cx:
        pts.append(np.array([W - p, 0.0]))
    
    p0 = np.array([W - p, 0.0])
    p1 = p0 + np.array([a, 0.0])
    p2 = p0 + np.array([a + b, 0.0])
    p3 = p0 + np.array([a + b + c, d])
    pts.extend(cubic_bezier(p0, p1, p2, p3)[1:])
    
    angles = np.linspace(-np.pi/2 + np.radians(angle_alpha), -np.radians(angle_alpha), 60)
    center_tr = np.array([W - r, r])
    arc_pts = center_tr + r * np.column_stack([np.cos(angles), np.sin(angles)])
    pts.extend(arc_pts[1:])
    
    bp0 = arc_pts[-1]
    bp1 = bp0 + np.array([d, c])
    bp2 = bp0 + np.array([d, b + c])
    bp3 = bp0 + np.array([d, a + b + c])
    pts.extend(cubic_bezier(bp0, bp1, bp2, bp3)[1:])
    
    if cy > p:
        pts.append(np.array([float(W), cy]))
        
    tr_curve = np.array(pts)
    br_curve = tr_curve[::-1].copy()
    br_curve[:, 1] = H - br_curve[:, 1]
    bl_curve = br_curve[::-1].copy()
    bl_curve[:, 0] = W - bl_curve[:, 0]
    tl_curve = bl_curve[::-1].copy()
    tl_curve[:, 1] = H - tl_curve[:, 1]
    
    full_polygon = np.vstack([tr_curve, br_curve, bl_curve, tl_curve])
    
    mask_img = Image.new('L', (W, H), 0)
    draw = ImageDraw.Draw(mask_img)
    poly_tuples = [(float(pt[0]), float(pt[1])) for pt in full_polygon]
    draw.polygon(poly_tuples, fill=255)
    
    mask = mask_img.resize((size, size), Image.Resampling.LANCZOS)
    return mask, poly_tuples, (W, H, supersample)

def create_apple_icon(src_img, size, add_rim=True):
    mask, poly_tuples, (W, H, ss) = generate_apple_squircle_mask(size, supersample=8)
    
    # Resize source
    img = src_img.resize((size, size), Image.Resampling.LANCZOS).convert('RGBA')
    img.putalpha(mask)
    
    if add_rim:
        # Generate subtle Apple-style inner highlight rim
        stroke_img = Image.new('L', (W, H), 0)
        stroke_draw = ImageDraw.Draw(stroke_img)
        # Inner stroke width proportional to size
        stroke_w = max(ss, int(ss * (size / 256.0)))
        stroke_draw.polygon(poly_tuples, outline=255, width=stroke_w)
        stroke_mask = stroke_img.resize((size, size), Image.Resampling.LANCZOS)
        
        mask_arr = np.array(mask).astype(float) / 255.0
        stroke_arr = (np.array(stroke_mask).astype(float) / 255.0) * mask_arr
        
        # Subtle rim gradient (brighter at top: 0.20 -> 0.05 at bottom)
        y_coords = np.linspace(0.20, 0.05, size).reshape(-1, 1)
        rim_alpha = (stroke_arr * y_coords * 255).clip(0, 255).astype(np.uint8)
        
        rim_img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
        rim_img.putalpha(Image.fromarray(rim_alpha))
        img = Image.alpha_composite(img, rim_img)
        
    return img

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_bak = os.path.join(root_dir, 'public', 'icons', 'logo.png.bak')
    if not os.path.exists(logo_bak):
        logo_bak = os.path.join(root_dir, 'public', 'icons', 'logo.png')
        
    print(f'Loading source from: {logo_bak}')
    src_img = Image.open(logo_bak).convert('RGBA')
    
    # 1. Generate 1254x1254 master logo
    print('Generating 1254x1254 master logo...')
    logo_1254 = create_apple_icon(src_img, 1254, add_rim=True)
    logo_path = os.path.join(root_dir, 'public', 'icons', 'logo.png')
    logo_1254.save(logo_path, format='PNG')
    print(f'Saved: {logo_path}')
    
    # 2. Generate 512x512 icon
    print('Generating 512x512 icon...')
    logo_512 = create_apple_icon(src_img, 512, add_rim=True)
    icon_512_path = os.path.join(root_dir, 'public', 'icons', 'icon-512.png')
    logo_512.save(icon_512_path, format='PNG')
    print(f'Saved: {icon_512_path}')
    
    # 3. Generate 192x192 icon
    print('Generating 192x192 icon...')
    logo_192 = create_apple_icon(src_img, 192, add_rim=True)
    icon_192_path = os.path.join(root_dir, 'public', 'icons', 'icon-192.png')
    logo_192.save(icon_192_path, format='PNG')
    print(f'Saved: {icon_192_path}')
    
    # 4. Generate multi-resolution favicon.ico
    print('Generating multi-resolution favicon.ico...')
    fav_path = os.path.join(root_dir, 'public', 'favicon.ico')
    # Generate each size with proper rim
    sizes = [256, 128, 64, 48, 32, 16]
    images_by_size = [create_apple_icon(src_img, s, add_rim=True) for s in sizes]
    images_by_size[0].save(fav_path, format='ICO', sizes=[(s, s) for s in sizes], append_images=images_by_size[1:])
    print(f'Saved: {fav_path}')
    
    # 5. Sync to dist if dist exists
    dist_dir = os.path.join(root_dir, 'dist')
    if os.path.exists(dist_dir):
        dist_icons = os.path.join(dist_dir, 'icons')
        os.makedirs(dist_icons, exist_ok=True)
        shutil.copy2(logo_path, os.path.join(dist_icons, 'logo.png'))
        shutil.copy2(icon_512_path, os.path.join(dist_icons, 'icon-512.png'))
        shutil.copy2(icon_192_path, os.path.join(dist_icons, 'icon-192.png'))
        shutil.copy2(fav_path, os.path.join(dist_dir, 'favicon.ico'))
        print('Synced icons to dist/')
        
    # 6. Generate and update Chrome PWA / Desktop ICO
    chrome_ico_dir = r'C:\Users\jiaho\AppData\Local\Google\Chrome\User Data\Default\Web Applications\_crx_doonknmbpbhbmdnipfcejnlfafjnlagg'
    if os.path.exists(chrome_ico_dir):
        chrome_ico_path = os.path.join(chrome_ico_dir, 'Axon - Student Assistant.ico')
        chrome_ico_md5 = os.path.join(chrome_ico_dir, 'Axon - Student Assistant.ico.md5')
        
        # Save multi-res ICO to Chrome PWA
        images_by_size[0].save(chrome_ico_path, format='ICO', sizes=[(s, s) for s in sizes], append_images=images_by_size[1:])
        print(f'Updated Chrome PWA ICO at: {chrome_ico_path}')
        
        # Compute MD5
        with open(chrome_ico_path, 'rb') as f:
            ico_bytes = f.read()
            md5_hash = hashlib.md5(ico_bytes).digest()
        with open(chrome_ico_md5, 'wb') as f:
            f.write(md5_hash)
        print(f'Updated MD5 checksum at: {chrome_ico_md5}')
        
    print('All icons generated successfully!')

if __name__ == '__main__':
    main()
