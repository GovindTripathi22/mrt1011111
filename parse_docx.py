import json
import re

def parse_docx_content(filename):
    with open(filename, 'r', encoding='utf-16') as f:
        lines = f.readlines()

    categories = []
    current_category = None
    current_section = None

    # Category matching (e.g., "Home & Kitchen", "Beauty & Personal Care")
    # Section matching (e.g., "Top Picks", "Trending Now", "Editor’s Choice")
    # Product matching (e.g., "Product Name - https://amzn.to/...")

    category_names = [
        "Home & Kitchen", "Beauty & Personal Care", "Health & Wellness",
        "Pet Supplies", "Baby & Kids Essentials", "Electronics & Accessories",
        "Sports & Fitness"
    ]

    sections = ["Top Picks", "Trending Now", "Editor’s Choice"]

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect Category
        for cat in category_names:
            if cat in line:
                current_category = {"name": cat, "products": []}
                categories.append(current_category)
                break
        
        # Detect Section
        for sec in sections:
            if sec in line:
                current_section = sec
                break

        # Detect Product and Link
        if " - http" in line:
            parts = line.split(" - http")
            name = parts[0].strip(" ").strip()
            url = "http" + parts[1].strip()
            if current_category:
                current_category["products"].append({
                    "name": name,
                    "url": url,
                    "badge": current_section
                })

    return categories

if __name__ == "__main__":
    data = parse_docx_content('docx_content.txt')
    print(json.dumps(data, indent=2))
