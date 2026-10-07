// One editor, for articles and for letters.
//
// Self-hosted on purpose: the skin, the icons and every plugin are imported
// here and bundled, so the editor never calls out to a CDN, needs no API key,
// and keeps working if someone else's service has a bad day. TinyMCE is GPL
// when it is self-hosted, which is what `license_key: "gpl"` declares.
//
// It is heavy -- a few hundred kilobytes -- so nothing imports this file
// directly. The two screens that need it load it with React.lazy, and a
// reader who never opens the dashboard never pays for it.
import { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";

import "tinymce/tinymce";
import "tinymce/models/dom";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide-dark/skin.js";

import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/code";
import "tinymce/plugins/image";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/media";
import "tinymce/plugins/quickbars";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";

import { api } from "../data/api.js";

// The editing surface is made to look like the page the writing ends up on,
// so what is written is what is seen rather than a white box pretending.
const CONTENT_STYLE = `
  body {
    background: #141a27;
    color: #e8ecf5;
    font-family: Sora, ui-sans-serif, system-ui, sans-serif;
    font-size: 17px;
    line-height: 1.75;
    padding: 20px 22px;
    margin: 0;
  }
  h1, h2, h3, h4 { color: #ffffff; font-weight: 800; line-height: 1.25; margin: 1.6em 0 0.5em; }
  h1 { font-size: 30px } h2 { font-size: 25px } h3 { font-size: 21px }
  p { margin: 0 0 1.15em }
  a { color: #8ab4ff }
  blockquote {
    margin: 1.5em 0; padding: 2px 0 2px 18px;
    border-left: 3px solid #e0208c; color: #c7cede; font-style: italic;
  }
  img { max-width: 100%; height: auto; border-radius: 14px }
  figure { margin: 1.6em 0 } figcaption { color: #96a0b5; font-size: 14px; text-align: center }
  code {
    background: #0f1420; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px; padding: 1px 6px; font-size: 15px;
  }
  pre { background: #0f1420; border-radius: 12px; padding: 16px; overflow: auto }
  table { border-collapse: collapse; width: 100% }
  table td, table th { border: 1px solid rgba(255,255,255,0.18); padding: 8px 10px }
  hr { border: 0; border-top: 1px solid rgba(255,255,255,0.18); margin: 2em 0 }
`;

// Enough to write an article with, and no more. The old letter editor asked
// people to assemble a page out of blocks; this asks them to write.
const TOOLBAR =
  "undo redo | blocks | bold italic underline strikethrough | " +
  "bullist numlist blockquote | link image media table | alignleft aligncenter | removeformat code";

export default function RichText({
  value,
  onChange,
  folder = "blog",
  height = 560,
  placeholder = "Start writing…",
}) {
  const ref = useRef(null);

  // A picture dropped into the article goes to the same place every other
  // upload goes, and comes back as a URL the post can keep.
  const uploadPicture = (blobInfo) =>
    api
      .upload(`/uploads?folder=${folder}`, blobInfo.blob())
      .then(({ url }) => {
        if (!url) throw new Error("The upload came back without an address");
        return url;
      })
      .catch((error) => {
        // TinyMCE shows whatever this rejects with, so it has to read like a
        // sentence rather than a stack trace.
        throw new Error(error?.message || "That picture would not upload");
      });

  return (
    <Editor
      licenseKey="gpl"
      onInit={(_event, editor) => {
        ref.current = editor;
      }}
      value={value}
      onEditorChange={onChange}
      init={{
        height,
        menubar: false,
        branding: false,
        promotion: false,
        statusbar: true,
        resize: true,
        placeholder,
        // The skin and content CSS are bundled above, so TinyMCE must not try
        // to fetch them by name.
        skin: false,
        content_css: false,
        content_style: CONTENT_STYLE,
        plugins:
          "advlist autolink code image link lists media quickbars searchreplace table wordcount",
        toolbar: TOOLBAR,
        block_formats: "Paragraph=p; Heading=h2; Subheading=h3; Small heading=h4",
        // Selecting text offers the few things worth doing to it.
        quickbars_selection_toolbar: "bold italic link blockquote",
        quickbars_insert_toolbar: false,
        contextmenu: false,
        image_caption: true,
        image_dimensions: false,
        // Pasting from a document brings the words, not the other site's fonts.
        paste_as_text: false,
        paste_webkit_styles: "none",
        images_upload_handler: uploadPicture,
        automatic_uploads: true,
        file_picker_types: "image",
        link_default_target: "_blank",
        link_title: false,
        convert_urls: false,
      }}
    />
  );
}
