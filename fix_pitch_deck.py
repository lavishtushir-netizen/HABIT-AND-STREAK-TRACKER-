with open("pitch_deck.html", "r", encoding="utf-8") as f:
    content = f.read()

# Make spacing slightly tighter so Page 3 never spills onto Page 4
content = content.replace("margin: 14mm 16mm 14mm 16mm;", "margin: 10mm 14mm 10mm 14mm;")
content = content.replace("margin-bottom: 11px;\n      padding-bottom: 11px;", "margin-bottom: 8px;\n      padding-bottom: 8px;")
content = content.replace("padding: 10px 14px;\n      margin-bottom: 10px;", "padding: 8px 12px;\n      margin-bottom: 8px;")
content = content.replace("padding-top: 8px;\n      margin-top: 14px;", "padding-top: 6px;\n      margin-top: 10px;")

with open("pitch_deck.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated pitch_deck.html successfully")
