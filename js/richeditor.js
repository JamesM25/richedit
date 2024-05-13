const PARAGRAPH_TYPE_NAMES = {
    "P": "Paragraph",
    "H1": "Heading 1",
    "H2": "Heading 2",
    "H3": "Heading 3",
    "H4": "Heading 4",
    "H5": "Heading 5",
    "H6": "Heading 6"
}

class RichEditor {
    constructor(root) {
        this.root = root;
        this.buttons = root.appendChild(document.createElement("div"));
        this.input = root.appendChild(document.createElement("div"));
        this.htmlInput = root.appendChild(document.createElement("div"));
        
        this.root.classList.add("richeditor-root");
    
        this.input.contentEditable = true;
        this.input.role = "textbox";
        this.input.classList.add("richeditor-input");
        this.input.addEventListener("beforeinput", (event) => this.#handleInput(event));
        this.input.innerHTML = "<p><br></p>";
        document.addEventListener('selectionchange', (event) => this.#refreshSelection());

        this.htmlInput.contentEditable = true;
        this.htmlInput.role = "textbox";
        this.htmlInput.classList.add("richeditor-input-html");
        this.htmlInput.addEventListener("beforeinput", (event) => this.#handleHtmlInput(event));
        this.htmlInput.innerHTML = "<p><br></p>";
        this.htmlInput.style.display = 'none';

        this.htmlMode = false;
    
        this.buttons.classList.add("richeditor-buttons");

        this.paragraphType = this.buttons.appendChild(document.createElement('select'));
        for (const [key, value] of Object.entries(PARAGRAPH_TYPE_NAMES)) {
            const option = this.paragraphType.appendChild(document.createElement('option'));
            option.value = key;
            option.textContent = value;
        }

        this.paragraphType.addEventListener('change', (event) => this.#selectParagraphType(event.target.value));

        this.#addButton("Visual / HTML", () => this.#toggleHtmlMode());        
    }

    #addButton(text, callback) {
        const button = document.createElement("button");
        button.textContent = text;
        button.addEventListener("click", callback);
        this.buttons.appendChild(button);
    }

    #isNodeInput(node) {
        while (node != null) {
            if (node === this.input) return true;
            node = node.parentNode;
        }

        return false;
    }

    #getParagraphNode(node) {
        if (!this.#isNodeInput(node)) return null;

        while (node != null) {
            if (node === this.input) break;
            if (node.nodeName in PARAGRAPH_TYPE_NAMES) return node;
            node = node.parentElement;
        }

        return null;
    }

    #refreshSelection() {
        const selection = document.getSelection();
        const node = selection.anchorNode;
        if (!this.#isNodeInput(node)) return;

        let para = this.#getParagraphNode(node);
        if (para == null) {
            para = document.createElement('p');
            node.after(para);
            para.appendChild(node);
        }

        this.paragraphType.value = para.nodeName;
    }

    #handleInput(event) {
        const selection = document.getSelection();

        if (event.inputType === 'insertParagraph') {
            event.preventDefault();

            const isWhiteSpace = /^\s+$/.test(selection.anchorNode.textContent);
            if (isWhiteSpace) {
                selection.anchorNode.after(document.createElement('BR'));
            } else {
                let current = selection.anchorNode;
                while (current.parentNode != this.input) {
                    current = current.parentNode;
                }

                if (current.nodeType === Node.TEXT_NODE) {
                    const old = current;
                    current = document.createElement('p');
                    old.after(current);
                    current.textContent = old.textContent;
                    old.remove();
                }

                const paragraph = document.createElement('p');
                paragraph.innerHTML = "<br>";
                current.after(paragraph);

                const range = document.createRange();
                range.setStart(paragraph, 0);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    #handleHtmlInput(event) {

    }

    #selectParagraphType(tagName) {
        const selection = document.getSelection();
        const node = selection.anchorNode;
        const caretPos = selection.anchorOffset;

        const oldPara = this.#getParagraphNode(node);
        if (oldPara.tagName === tagName) return;

        const newPara = document.createElement(tagName);
        oldPara.after(newPara);
        oldPara.childNodes.forEach((child) => newPara.appendChild(child));
        oldPara.remove();

        const range = document.createRange();
        range.setStart(node, caretPos);
        range.collapse();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    #htmlToRaw(html) {
        
        let raw = html.replaceAll(/<(p|h[1-6])>/gi, match => `${match}\n`);
        raw = raw.replaceAll(/<\/(p|h[1-6])>/gi, match => `\n${match}\n`);

        raw = raw.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>');
        return raw;
    }
    #rawToHtml(raw) {
        let html = raw.replaceAll('&lt;', '<').replaceAll('&gt;', '>');
        return html;
    }

    #toggleHtmlMode() {
        if (!this.htmlMode) {
            this.input.style.display = 'none';
            this.htmlInput.style.display = 'block';
            this.htmlInput.innerHTML = this.#htmlToRaw(this.input.innerHTML);
        } else {
            this.input.style.display = 'block';
            this.htmlInput.style.display = 'none';
            this.input.innerHTML = this.#rawToHtml(this.htmlInput.textContent);
        }

        this.htmlMode = !this.htmlMode;
    }
}

function webeditInit(root) {
    const editor = new RichEditor(root);
    return editor;
}