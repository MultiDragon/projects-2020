#!/usr/bin/env python

import os
import sys
from subprocess import PIPE
from subprocess import Popen as proc
import yaml

def create_tex(meta, projects):
    texs = []
    for i in projects:
        path = os.path.expanduser(i["file"])
        with open(path) as f:
            texs.append(";;" + i["title"])
            texs += f.readlines()

    fixed_texs = meta["header"]

    flag = 0
    big_math = 0
    big_math_str = ""
    for i in texs:
        i = i.strip()
        if len(i) == 0:
            continue

        bad = False
        for j in meta["blocked"]:
            if i.find(j) == 0:
                bad = True
                break
        if bad:
            continue

        if i[0] == ";" and i[1] == ";":
            fixed_texs.append("\\newpage")
            fixed_texs.append(i[2:])
            continue

        for j in meta["start"]:
            if i.find(j) == 0:
                flag = 2
                if i[-2:] == "\\[":
                    big_math = 2
                    big_math_str = i
                else:
                    fixed_texs.append(i)
                break
        if big_math and i.find("\\]") != -1:
            big_math_str += "\n" + i
            fixed_texs.append(big_math_str)
            big_math = 0

        if big_math:
            if big_math != 2:
                big_math_str += "\n" + i
            big_math = 1
        elif flag == 1:
            for j in meta["continue"]:
                if i.find(j) == 0:
                    flag = 3
                    fixed_texs.append(i)
                    break

        if flag >= 2:
            flag = 1
        else:
            flag = 0
    fixed_texs += meta["footer"]
    return "\n\n".join(fixed_texs)

def process(name):
    with open("docs/" + name + ".yaml") as f:
        dmap = yaml.safe_load(f)
        tex = create_tex(dmap["metadata"], dmap["projects"])
        if not tex:
            return
        with open("tmp/" + name + ".tex", "w") as f2:
            f2.write(tex)
        os.chdir("tmp")
        proc(["pdflatex", name + ".tex"]).wait()
        proc(["pdflatex", name + ".tex"]).wait()
        proc(["mv", name + ".pdf", "../out"]).wait()
        os.chdir("..")
        print("Processing " + name + " complete")

def main():
    if len(sys.argv) == 1:
        usage()
        return

    if sys.argv[1] == "all":
        for name in os.listdir("docs"):
            name = name.split(".")[0]
            print("Processing " + name)
            process(name)
    else:
        process(sys.argv[1])

def usage():
    print("Usage: " + sys.argv[0] + " <pdf_name>")

if __name__ == "__main__":
    main()
