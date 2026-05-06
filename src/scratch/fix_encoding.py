import os

def fix_encoding(text):
    # Common Mojibake patterns for Vietnamese UTF-8 read as Latin-1
    replacements = {
        'Ã ': 'à', 'Ã¡': 'á', 'áº¡': 'ạ', 'Ã£': 'ã', 'áº£': 'ả',
        'Ãª': 'ê', 'á»ƒ': 'ể', 'á»…': 'ễ', 'á»‡': 'ệ', 'áº¿': 'ế', 'á» ': 'ề',
        'Ã­': 'í', 'Ã¬': 'ì', 'á»‹': 'ị', 'Ä‘': 'đ', 'Ä ': 'Đ',
        'Ã´': 'ô', 'á»‘': 'ố', 'á»“': 'ồ', 'á»™': 'ộ', 'á»•': 'ổ', 'á»—': 'ỗ',
        'Æ¡': 'ơ', 'á»›': 'ớ', 'á» ': 'ờ', 'á»£': 'ợ', 'á»Ÿ': 'ở', 'á»¡': 'ỡ',
        'Ã¹': 'ù', 'Ãº': 'ú', 'á»¥': 'ụ', 'á»§': 'ủ', 'Å©': 'ũ',
        'Æ°': 'ư', 'á»©': 'ứ', 'á»«': 'ừ', 'á»±': 'ự', 'á»­': 'ử', 'á»¯': 'ữ',
        'Ã²': 'ò', 'Ã³': 'ó', 'á» ': 'ọ', 'á» ': 'ỏ', 'Ãµ': 'õ',
        'Ã¨': 'è', 'Ã©': 'é', 'áº¹': 'ẹ', 'áº½': 'ẽ', 'áº¹': 'ẻ',
        'â€º': '›', 'â€”': '—', 'â€¢': '•', 'â€¦': '…',
        'ðŸŽ¯': '🎯', 'ðŸ“ ': '📚', 'ðŸ“–': '📖', 'ðŸ”¥': '🔥', 'ðŸ’ª': '💪'
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text

file_path = r'd:\FPTU_LearningMaterial\Semester 9\DE THI N5-N1\Voca\vocab-quiz-react\src\pages\HomePage.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

fixed_content = fix_encoding(content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Encoding fix applied successfully.")
