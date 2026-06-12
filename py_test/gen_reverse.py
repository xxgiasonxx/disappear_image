def gen_white_and_black_image(width, height):
    # rgb(255, 255, 255) is white, rgb(0, 0, 0) is black
    # white and black pixels are chessboard pattern
    image = []
    for i in range(height):
        row = []
        for j in range(width):
            if (i + j) % 2 == 0:
                row.append((255, 255, 255))  # white
            else:
                row.append((0, 0, 0))  # black
        image.append(row)
    return image

def save_image(image, filename):
    from PIL import Image
    img = Image.new('RGB', (len(image[0]), len(image)))
    for i in range(len(image)):
        for j in range(len(image[0])):
            img.putpixel((j, i), image[i][j])
    img.save(filename)

if __name__ == "__main__":
    width = 2048
    height = 2048
    width, height = 299, 878
    image = gen_white_and_black_image(width, height)
    save_image(image, 'white_and_black.png')

