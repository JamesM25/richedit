const PARAGRAPH_TYPE_NAMES = {
    "P": "Paragraph",
    "UL": "Bullet list",
    "OL": "Numbered list",
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
        
        this.root.classList.add("richedit-root");
    
        this.input.contentEditable = true;
        this.input.role = "textbox";
        this.input.classList.add("richedit-input");
        this.input.addEventListener("beforeinput", (event) => this.#handleInput(event));
        this.input.innerHTML = "<p><br></p>";
        document.addEventListener('selectionchange', (event) => this.#refreshSelection());

        this.htmlInput.contentEditable = true;
        this.htmlInput.role = "textbox";
        this.htmlInput.classList.add("richedit-input-html");
        this.htmlInput.addEventListener("beforeinput", (event) => this.#handleHtmlInput(event));
        this.htmlInput.innerHTML = "<p><br></p>";
        this.htmlInput.style.display = 'none';

        this.htmlMode = false;
    
        this.buttons.classList.add("richedit-buttons");

        this.paragraphType = this.buttons.appendChild(document.createElement('select'));
        for (const [key, value] of Object.entries(PARAGRAPH_TYPE_NAMES)) {
            const option = this.paragraphType.appendChild(document.createElement('option'));
            option.value = key;
            option.textContent = value;
        }

        this.paragraphType.addEventListener('change', (event) => this.#selectParagraphType(event.target.value));

        // this.#addButton("Italic", () => this.#toggleInlineTag('EM'));
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

    #isSelectionValid() {
        const selection = document.getSelection();

        if (selection.anchorNode == null) return false;
        
        for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            let node = range.commonAncestorContainer;
            while (node != null && node != this.input) node = node.parentNode;
            if (node === null) return false;
        }

        return true;
    }

    #toggleInlineTag(tagName) {
        if (!this.#isSelectionValid()) return;

        const selection = document.getSelection();

        let node = selection.anchorNode;
        let content = node.textContent.substring(selection.anchorOffset);
        while (node != selection.focusNode) {
            console.log(content);
            node = node.nextSibling;
            console.log(node);
            content += node.textContent;
        }

        content += node.textContent.substring(0, selection.focusOffset);
        console.log(content);
    }

    #refreshSelection() {
        if (!this.#isSelectionValid()) return;

        const selection = document.getSelection();
        const node = selection.anchorNode;

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

            const anchor = selection.anchorNode;
            const anchorOffset = selection.anchorOffset;

            const selectionLeft = anchor.textContent.substring(0, anchorOffset);
            const selectionRight = anchor.textContent.substring(anchorOffset);

            let current = this.#getParagraphNode(anchor);
            let nextTagName = 'P';

            if (current == null) {
                const old = anchor;
                current = document.createElement('p');
                old.after(current);
                current.textContent = old.textContent;
                old.remove();
            } else if (current.tagName === 'UL' || current.tagName === 'OL') {
                if (selection.anchorNode.nodeType == Node.TEXT_NODE) {
                    current = anchor;
                    while (current != null && current.tagName != 'LI') current = current.parentElement;
                    nextTagName = 'LI';
                } else if (selection.anchorNode.tagName == 'LI') {
                    const li = selection.anchorNode;
                    if (li.textContent.length == 0) selection.anchorNode.remove();
                }
            }

            anchor.innerHTML = selectionLeft.length > 0 ? selectionLeft : '<br>';

            const paragraph = document.createElement(nextTagName);
            paragraph.innerHTML = selectionRight.length > 0 ? selectionRight : '<br>';
            current.after(paragraph);

            const range = document.createRange();
            range.setStart(paragraph, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    #handleHtmlInput(event) {

    }

    #selectParagraphType(tagName) {
        if (!this.#isSelectionValid()) return;

        const selection = document.getSelection();
        const node = selection.anchorNode;
        const caretPos = selection.anchorOffset;

        const oldPara = this.#getParagraphNode(node);
        if (oldPara.tagName === tagName) return;

        const oldList = oldPara.tagName === 'UL' || oldPara.tagName === 'OL';
        const newList = tagName === 'UL' || tagName === 'OL';

        if (oldList && !newList) {
            for (const li of oldPara.querySelectorAll('li')) {
                li.childNodes.forEach(child => li.after(child));
                li.remove();
            }
        }

        const newPara = document.createElement(tagName);
        oldPara.after(newPara);
        const container = (newList && !oldList)
            ? newPara.appendChild(document.createElement('LI'))
            : newPara;
        oldPara.childNodes.forEach((child) => container.appendChild(child));
        oldPara.remove();

        const range = document.createRange();
        range.setStart(node, caretPos);
        range.collapse();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    #htmlToRaw(html) {
        let raw = html.replaceAll(/<\/?(p|h[1-6]|ul|ol|li)>/gi, match => `\n${match}\n`).trim();

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

function initRichedit(root) {
    const editor = new RichEditor(root);
    return editor;
}