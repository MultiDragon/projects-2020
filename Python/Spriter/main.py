#!/usr/bin/env python

import os
import sys
from PIL import Image, ImageDraw, ImageFont
import yaml

def load_sprite(id):
    filename = "sprites/" + id + ".yaml"
    if not os.path.isfile(filename):
        return False
    with open(filename) as f:
        dmap = yaml.safe_load(f)
        dmap["regions"] = {}
        img = Image.open("resources/" + dmap["file"])
        for i in range(len(dmap["images"])):
            x_shift = (i % dmap["x"]) * dmap["height"]
            y_shift = (i // dmap["x"]) * dmap["width"]
            dmap["regions"][dmap["images"][i]] = img.crop(
                (x_shift, y_shift,
                 x_shift + dmap["width"], y_shift + dmap["height"]))
        return dmap

LINE_SIZE = 4
def create_chart(data, rows):
    height = data["rows"] * data["row_height"] + (data["rows"] + 1) * LINE_SIZE
    width = LINE_SIZE
    for col_w in data["column_width"]:
        width += LINE_SIZE + col_w

    chart = Image.new("RGB", (width, height), (255, 255, 255))

    black = (0, 0, 0)
    drawer = ImageDraw.Draw(chart)
    for i in range(data["rows"] + 1):
        row_start = i * (data["row_height"] + LINE_SIZE)
        drawer.rectangle([0, row_start, width - 1, row_start + LINE_SIZE - 1], black, black)

    drawer.rectangle([0, 0, LINE_SIZE - 1, height - 1], black, black)
    col_start = LINE_SIZE
    for col_w in data["column_width"]:
        col_start += col_w
        drawer.rectangle([col_start, 0, col_start + LINE_SIZE - 1, height - 1], black, black)
        col_start += LINE_SIZE

    font = ImageFont.truetype("resources/" + data["font"], data["font_size"])
    if data["sprite"]:
        sprite = load_sprite(data["sprite"])
    else:
        sprite = False

    for row_index in range(data["rows"]):
        row_start = LINE_SIZE + row_index * (data["row_height"] + LINE_SIZE)
        col_start = LINE_SIZE
        for cell_index in range(data["columns"]):
            cell = rows[row_index][cell_index]
            if cell is None:
                pass
            elif not isinstance(cell, list):
                text = str(cell)
                size = drawer.textsize(text, font)
                delta = (data["column_width"][cell_index], data["row_height"])
                drawer.text((
                    col_start + (delta[0] - size[0]) / 2,
                    row_start + (delta[1] - size[1]) / 2
                ), str(cell), black, font)
            elif sprite:
                shift = int((data["column_width"][cell_index] - len(cell) * sprite["width"]) / 2)
                for image in cell:
                    if sprite["regions"][image]:
                        chart.paste(sprite["regions"][image], (col_start + shift, row_start))
                    shift += sprite["width"]
            col_start += data["column_width"][cell_index] + LINE_SIZE

    size = drawer.textsize(data["header"], font)
    chart_with_header = Image.new("RGB", (width, height + LINE_SIZE + size[1]), (255, 255, 255))
    chart_with_header.paste(chart, (0, LINE_SIZE + size[1]))
    header_drawer = ImageDraw.Draw(chart_with_header)
    header_drawer.text(((width - size[0]) / 2, 0), data["header"], black, font)

    return chart_with_header

def process(name):
    with open("charts/" + name + ".yaml") as f:
        dmap = yaml.safe_load(f)
        image = create_chart(dmap["metadata"], dmap["rows"])
        image.save("out/" + name + ".png")

def main():
    if len(sys.argv) == 1:
        usage()
        return

    if sys.argv[1] == "all":
        for name in os.listdir("charts"):
            name = name.split(".")[0]
            print("Processing " + name)
            process(name)
    else:
        process(sys.argv[1])

def usage():
    print("Usage: " + sys.argv[0] + " <chart_name>")

if __name__ == "__main__":
    main()
