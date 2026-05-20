import os

def generate_tree(dir_path, prefix=""):
    files = []
    dirs = []
    
    try:
        items = os.listdir(dir_path)
    except PermissionError:
        return ""
        
    for item in items:
        if item in ["node_modules", "venv", ".git", "__pycache__", "dist", "build", "datasets", "models"]:
            continue
        path = os.path.join(dir_path, item)
        if os.path.isdir(path):
            dirs.append(item)
        else:
            files.append(item)
            
    dirs.sort()
    files.sort()
    
    output = ""
    for i, d in enumerate(dirs):
        is_last = (i == len(dirs) - 1) and (len(files) == 0)
        connector = "└── " if is_last else "├── "
        output += prefix + connector + d + "/\n"
        extension = "    " if is_last else "│   "
        output += generate_tree(os.path.join(dir_path, d), prefix + extension)
        
    for i, f in enumerate(files):
        is_last = (i == len(files) - 1)
        connector = "└── " if is_last else "├── "
        output += prefix + connector + f + "\n"
        
    return output

if __name__ == "__main__":
    base_dir = r"c:\Users\Abdrh\OneDrive\سطح المكتب\Graduation Project\PRO2-Rnsm\PRO2\PRO2"
    tree = f"{os.path.basename(base_dir)}/\n" + generate_tree(base_dir)
    with open("tree_output.txt", "w", encoding="utf-8") as f:
        f.write(tree)
    print("Tree generated in tree_output.txt")
