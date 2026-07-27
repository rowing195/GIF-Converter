import os
from PIL import Image, ImageDraw, ImageFont

def create_sample_gif(output_path="sample.gif", num_frames=10):
    images = []
    width, height = 200, 200
    
    colors = [
        (255, 99, 71),   # Tomato
        (135, 206, 235), # SkyBlue
        (50, 205, 50),   # LimeGreen
        (255, 215, 0),   # Gold
        (238, 130, 238), # Violet
        (255, 140, 0),   # DarkOrange
        (72, 209, 204),  # MediumTurquoise
        (219, 112, 147), # PaleVioletRed
        (0, 191, 255),   # DeepSkyBlue
        (154, 205, 50)   # YellowGreen
    ]
    
    for i in range(num_frames):
        # Create image with solid color circle inside
        img = Image.new("RGBA", (width, height), (30, 30, 40, 255))
        draw = ImageDraw.Draw(img)
        
        # Circle moving across frame
        color = colors[i % len(colors)]
        cx = 50 + (i * 10)
        cy = 100 + (math.sin(i) * 20)
        r = 35
        
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color, outline=(255, 255, 255, 200), width=3)
        
        # Draw frame number text
        draw.text((20, 20), f"Frame #{i}", fill=(255, 255, 255, 255))
        draw.text((20, 160), f"Delay: {100 + i * 10} ms", fill=(200, 200, 200, 255))
        
        images.append(img)
        
    durations = [100 + i * 10 for i in range(num_frames)]
    
    images[0].save(
        output_path,
        save_all=True,
        append_images=images[1:],
        duration=durations,
        loop=0
    )
    print(f"Sample GIF created successfully at {output_path}")

if __name__ == "__main__":
    import math
    create_sample_gif()
