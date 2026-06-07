"use client";

import { useColorMode } from "@/components/ui/color-mode";
// components/RichTextEditor.tsx
import React, { useCallback } from "react";
import { } from "@chakra-ui/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import ImageResize from "tiptap-extension-resize-image";

// Define component props interface
export interface RichTextEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	readOnly?: boolean;
	style?: React.CSSProperties;
	className?: string;
	minHeight?: string;
	maxHeight?: string;
	autoFocus?: boolean;
	onFocus?: () => void;
	onBlur?: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
	value,
	onChange,
	placeholder = "Enter text...",
	readOnly = false,
	style,
	className,
	minHeight = "200px",
	maxHeight = "600px",
	autoFocus = false,
	onFocus,
	onBlur,
}) => {
	const { colorMode } = useColorMode();

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3, 4, 5, 6],
				},
				bulletList: {
					keepMarks: true,
					keepAttributes: false,
				},
				orderedList: {
					keepMarks: true,
					keepAttributes: false,
				},
			}),
			TextStyle,
			FontFamily,
			TextAlign.configure({
				types: ["heading", "paragraph"],
				alignments: ["left", "center", "right", "justify"],
			}),
			Underline,
			Subscript,
			Superscript,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "editor-link",
				},
			}),
			Color,
			Highlight.configure({
				multicolor: true,
			}),
			Image.configure({
				inline: true,
				allowBase64: true,
			}),
			ImageResize,
		],
		content: value,
		editable: !readOnly,
		autofocus: autoFocus,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
		onFocus: () => onFocus?.(),
		onBlur: () => onBlur?.(),
	});

	const setLink = useCallback(() => {
		if (!editor) return;
		const url = window.prompt("Enter URL:");
		if (url) {
			editor.chain().focus().setLink({ href: url }).run();
		}
	}, [editor]);

	const addImage = useCallback(() => {
		if (!editor) return;
		const url = window.prompt("Enter image URL:");
		if (url) {
			editor.chain().focus().setImage({ src: url }).run();
		}
	}, [editor]);

	const editorBg = colorMode === "dark" ? "#2D3748" : "#FFFFFF";
	const editorTextColor = colorMode === "dark" ? "#CBD5E0" : "#2D3748";
	const borderColor = colorMode === "dark" ? "#4A5568" : "#E2E8F0";

	if (!editor) {
		return null;
	}

	return (
		<div className={`tiptap-editor ${className || ""}`} style={style}>
			{!readOnly && (
				<div className="editor-toolbar">
					<select
						onChange={(e) => {
							if (e.target.value === "paragraph") {
								editor.chain().focus().setParagraph().run();
							} else {
								editor
									.chain()
									.focus()
									.toggleHeading({ level: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 })
									.run();
							}
						}}
						value={
							editor.isActive("heading", { level: 1 })
								? "1"
								: editor.isActive("heading", { level: 2 })
								? "2"
								: editor.isActive("heading", { level: 3 })
								? "3"
								: editor.isActive("heading", { level: 4 })
								? "4"
								: editor.isActive("heading", { level: 5 })
								? "5"
								: editor.isActive("heading", { level: 6 })
								? "6"
								: "paragraph"
						}
					>
						<option value="paragraph">Normal</option>
						<option value="1">Heading 1</option>
						<option value="2">Heading 2</option>
						<option value="3">Heading 3</option>
						<option value="4">Heading 4</option>
						<option value="5">Heading 5</option>
						<option value="6">Heading 6</option>
					</select>

					<select
						onChange={(e) => {
							if (e.target.value === "default") {
								editor.chain().focus().unsetFontFamily().run();
							} else {
								editor.chain().focus().setFontFamily(e.target.value).run();
							}
						}}
					>
						<option value="default">Default Font</option>
						<option value="Arial">Arial</option>
						<option value="Times New Roman">Times New Roman</option>
						<option value="Courier New">Courier New</option>
						<option value="Georgia">Georgia</option>
						<option value="Verdana">Verdana</option>
						<option value="Helvetica">Helvetica</option>
						<option value="Calibri">Calibri</option>
						<option value="Roboto">Roboto</option>
						<option value="Open Sans">Open Sans</option>
						<option value="Segoe UI">Segoe UI</option>
						<option value="Tahoma">Tahoma</option>
						<option value="Trebuchet MS">Trebuchet MS</option>
						<option value="Impact">Impact</option>
						<option value="Comic Sans MS">Comic Sans MS</option>
					</select>

					<div className="toolbar-group">
						<button
							onClick={() => editor.chain().focus().toggleBold().run()}
							className={editor.isActive("bold") ? "is-active" : ""}
							title="Bold (Ctrl+B)"
						>
							B
						</button>
						<button
							onClick={() => editor.chain().focus().toggleItalic().run()}
							className={editor.isActive("italic") ? "is-active" : ""}
							title="Italic (Ctrl+I)"
						>
							I
						</button>
						<button
							onClick={() => editor.chain().focus().toggleUnderline().run()}
							className={editor.isActive("underline") ? "is-active" : ""}
							title="Underline (Ctrl+U)"
						>
							U
						</button>
						<button
							onClick={() => editor.chain().focus().toggleStrike().run()}
							className={editor.isActive("strike") ? "is-active" : ""}
							title="Strikethrough"
						>
							S
						</button>
					</div>

					<div className="toolbar-group">
						<button
							onClick={() => editor.chain().focus().toggleSubscript().run()}
							className={editor.isActive("subscript") ? "is-active" : ""}
							title="Subscript"
						>
							X₂
						</button>
						<button
							onClick={() => editor.chain().focus().toggleSuperscript().run()}
							className={editor.isActive("superscript") ? "is-active" : ""}
							title="Superscript"
						>
							X²
						</button>
					</div>

					<div className="toolbar-group">
						<button
							onClick={() => editor.chain().focus().setTextAlign("left").run()}
							className={editor.isActive({ textAlign: "left" }) ? "is-active" : ""}
							title="Align Left"
						>
							←
						</button>
						<button
							onClick={() => editor.chain().focus().setTextAlign("center").run()}
							className={editor.isActive({ textAlign: "center" }) ? "is-active" : ""}
							title="Align Center"
						>
							 ↔
						</button>
						<button
							onClick={() => editor.chain().focus().setTextAlign("right").run()}
							className={editor.isActive({ textAlign: "right" }) ? "is-active" : ""}
							title="Align Right"
						>
							→
						</button>
						<button
							onClick={() => editor.chain().focus().setTextAlign("justify").run()}
							className={editor.isActive({ textAlign: "justify" }) ? "is-active" : ""}
							title="Justify"
						>
							 ⇔
						</button>
					</div>

					<div className="toolbar-group">
						<button
							onClick={() => editor.chain().focus().toggleBulletList().run()}
							className={editor.isActive("bulletList") ? "is-active" : ""}
							title="Bullet List"
						>
							•
						</button>
						<button
							onClick={() => editor.chain().focus().toggleOrderedList().run()}
							className={editor.isActive("orderedList") ? "is-active" : ""}
							title="Numbered List"
						>
							1.
						</button>
					</div>

					<div className="toolbar-group">
						<button
							onClick={() => editor.chain().focus().toggleBlockquote().run()}
							className={editor.isActive("blockquote") ? "is-active" : ""}
							title="Blockquote"
						>
							&ldquo;&rdquo;
						</button>
						<button
							onClick={() => editor.chain().focus().toggleCodeBlock().run()}
							className={editor.isActive("codeBlock") ? "is-active" : ""}
							title="Code Block"
						>
							{"< >"}
						</button>
					</div>

					<div className="toolbar-group">
						<input
							type="color"
							onInput={(e) => {
								editor.chain().focus().setColor(e.currentTarget.value).run();
							}}
							title="Text Color"
						/>
						<input
							type="color"
							onInput={(e) => {
								editor.chain().focus().toggleHighlight({ color: e.currentTarget.value }).run();
							}}
							title="Highlight Color"
						/>
					</div>

					<div className="toolbar-group">
						<button
							onClick={setLink}
							className={editor.isActive("link") ? "is-active" : ""}
							title="Add Link"
						>
							 🔗
						</button>
						<button
							onClick={() => editor.chain().focus().unsetLink().run()}
							disabled={!editor.isActive("link")}
							title="Remove Link"
						>
							 🔗❌
						</button>
					</div>

					<div className="toolbar-group">
						<button onClick={() => editor.chain().focus().undo().run()} title="Undo">
							 ↩
						</button>
						<button onClick={() => editor.chain().focus().redo().run()} title="Redo">
							 ↪
						</button>
					</div>

					<div className="toolbar-group">
						<button onClick={addImage} title="Add Image">
							 🖼
						</button>
					</div>
				</div>
			)}
			<EditorContent editor={editor} />
			<style jsx global>{`
				.tiptap-editor {
					border: 1px solid ${borderColor};
					border-radius: 0.375rem;
					overflow: hidden;
					position: relative;
				}

				.tiptap-editor .editor-toolbar {
					border-bottom: 1px solid ${borderColor};
					background-color: ${editorBg};
					padding: 8px;
					display: flex;
					gap: 8px;
					flex-wrap: wrap;
					align-items: center;
					position: sticky;
					top: 0;
					z-index: 50;
				}

				.tiptap-editor .toolbar-group {
					display: flex;
					gap: 4px;
					padding: 0 4px;
					border-right: 1px solid ${borderColor};
				}

				.tiptap-editor .toolbar-group:last-child {
					border-right: none;
				}

				.tiptap-editor button {
					padding: 4px 8px;
					border: 1px solid ${borderColor};
					border-radius: 4px;
					background: transparent;
					color: ${editorTextColor};
					cursor: pointer;
					min-width: 32px;
					display: flex;
					align-items: center;
					justify-content: center;
				}

				.tiptap-editor button:hover {
					background-color: ${colorMode === "dark" ? "#4A5568" : "#E2E8F0"};
				}

				.tiptap-editor button.is-active {
					background-color: ${colorMode === "dark" ? "#4A5568" : "#E2E8F0"};
				}

				.tiptap-editor button:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}

				.tiptap-editor select {
					padding: 4px 8px;
					border: 1px solid ${borderColor};
					border-radius: 4px;
					background-color: ${colorMode === "dark" ? "#2D3748" : "#FFFFFF"};
					color: ${editorTextColor};
					cursor: pointer;
					min-width: 100px;
				}

				.tiptap-editor select:hover {
					background-color: ${colorMode === "dark" ? "#4A5568" : "#E2E8F0"};
				}

				.tiptap-editor select option {
					background-color: ${colorMode === "dark" ? "#2D3748" : "#FFFFFF"};
					color: ${editorTextColor};
				}

				.tiptap-editor input[type="color"] {
					width: 32px;
					height: 32px;
					padding: 0;
					border: 1px solid ${borderColor};
					border-radius: 4px;
					cursor: pointer;
				}

				.tiptap-editor .ProseMirror {
					padding: 15px;
					min-height: ${minHeight};
					max-height: ${maxHeight};
					overflow-y: auto;
					background-color: ${editorBg};
					color: ${editorTextColor};
				}

				.tiptap-editor .ProseMirror p {
					margin: 0;
					line-height: 1.5;
				}

				.tiptap-editor .ProseMirror h1 {
					font-size: 2em;
					margin: 0.67em 0;
				}
				.tiptap-editor .ProseMirror h2 {
					font-size: 1.5em;
					margin: 0.75em 0;
				}
				.tiptap-editor .ProseMirror h3 {
					font-size: 1.17em;
					margin: 0.83em 0;
				}
				.tiptap-editor .ProseMirror h4 {
					margin: 1.12em 0;
				}
				.tiptap-editor .ProseMirror h5 {
					font-size: 0.83em;
					margin: 1.5em 0;
				}
				.tiptap-editor .ProseMirror h6 {
					font-size: 0.75em;
					margin: 1.67em 0;
				}

				.tiptap-editor .ProseMirror ul,
				.tiptap-editor .ProseMirror ol {
					padding-left: 2em;
					margin: 0.5em 0;
				}

				.tiptap-editor .ProseMirror blockquote {
					border-left: 3px solid ${borderColor};
					margin: 1em 0;
					padding-left: 1em;
					font-style: italic;
				}

				.tiptap-editor .ProseMirror pre {
					background: ${colorMode === "dark" ? "#2D3748" : "#f5f5f5"};
					border-radius: 4px;
					padding: 0.75em 1em;
					margin: 0.5em 0;
					overflow-x: auto;
				}

				.tiptap-editor .ProseMirror code {
					font-family: monospace;
					background: ${colorMode === "dark" ? "#2D3748" : "#f5f5f5"};
					padding: 0.2em 0.4em;
					border-radius: 4px;
				}

				.tiptap-editor .editor-link {
					color: #3182ce;
					text-decoration: underline;
					cursor: pointer;
				}

				.tiptap-editor .ProseMirror img {
					max-width: 100%;
					height: auto;
					cursor: pointer;
					display: block;
					margin: 0 auto;
				}

				.tiptap-editor .ProseMirror img.ProseMirror-selectednode {
					outline: 2px solid #68cef8;
				}

				.resize-trigger {
					position: absolute;
					width: 8px;
					height: 8px;
					border: 1px solid #68cef8;
					background: white;
				}

				.resize-trigger-br {
					bottom: -4px;
					right: -4px;
					cursor: se-resize;
				}

				.resize-trigger-bl {
					bottom: -4px;
					left: -4px;
					cursor: sw-resize;
				}

				.resize-trigger-tr {
					top: -4px;
					right: -4px;
					cursor: ne-resize;
				}

				.resize-trigger-tl {
					top: -4px;
					left: -4px;
					cursor: nw-resize;
				}

				.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
					color: ${colorMode === "dark" ? "#718096" : "#A0AEC0"};
					content: attr(data-placeholder);
					float: left;
					height: 0;
					pointer-events: none;
				}
			`}</style>
		</div>
	);
};

export default RichTextEditor;
