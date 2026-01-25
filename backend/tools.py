generate_cad_prototype_tool = {
    "name": "generate_cad_prototype",
    "description": "Genererar en 3D-trådmodellsprototyp baserat på användarens beskrivning. Använd detta när användaren ber om att 'visualisera', 'prototypa', 'skapa en trådmodell' eller 'designa' något i 3D.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "prompt": {
                "type": "STRING",
                "description": "Användarens beskrivning av objektet som ska prototypas."
            }
        },
        "required": ["prompt"]
    }
}

write_file_tool = {
    "name": "write_file",
    "description": "Skriver innehåll till en fil på den angivna sökvägen. Skriver över om filen redan finns.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "path": {
                "type": "STRING",
                "description": "Sökvägen till filen som ska skrivas."
            },
            "content": {
                "type": "STRING",
                "description": "Innehållet som ska skrivas till filen."
            }
        },
        "required": ["path", "content"]
    }
}

read_directory_tool = {
    "name": "read_directory",
    "description": "Listar innehållet i en mapp.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "path": {
                "type": "STRING",
                "description": "Sökvägen till mappen som ska listas."
            }
        },
        "required": ["path"]
    }
}

read_file_tool = {
    "name": "read_file",
    "description": "Läser innehållet i en fil.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "path": {
                "type": "STRING",
                "description": "Sökvägen till filen som ska läsas."
            }
        },
        "required": ["path"]
    }
}

tools_list = [{"function_declarations": [
    generate_cad_prototype_tool,
    write_file_tool,
    read_directory_tool,
    read_file_tool
]}]


