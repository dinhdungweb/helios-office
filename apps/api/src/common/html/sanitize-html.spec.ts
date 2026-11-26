import { sanitizeRichText } from "./sanitize-html";

describe("sanitizeRichText", () => {
  it.each([
    ["<p>Xin chào <strong>bạn</strong></p>", "<p>Xin chào <strong>bạn</strong></p>"],
    ["<script>alert(1)</script><p>ok</p>", "<p>ok</p>"],
    ["<SCRIPT >alert(1)</SCRIPT ><b>x</b>", "<b>x</b>"],
    ['<img src=x onerror="alert(1)">hi', "hi"],
    ['<p onclick="alert(1)" style="color:red">t</p>', "<p>t</p>"],
    ['<a href="javascript:alert(1)">x</a>', "<a>x</a>"],
    ['<a href="java&#x09;script:alert(1)">x</a>', "<a>x</a>"],
    ['<a href="&#106;avascript:alert(1)">x</a>', "<a>x</a>"],
    ['<a href=" JaVaScRiPt:alert(1)">x</a>', "<a>x</a>"],
    ['<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>', "<a>x</a>"],
    ['<a href="https://helios.vn/a?b=1&c=2" onmouseover="x">link</a>', '<a href="https://helios.vn/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">link</a>'],
    ['<a href=\'mailto:hr@helios.vn\'>mail</a>', '<a href="mailto:hr@helios.vn" target="_blank" rel="noopener noreferrer">mail</a>'],
    ["<iframe src=//evil></iframe>text", "text"],
    ["<svg><script>alert(1)</script></svg>after", "after"],
    ["<style>body{}</style><p>a</p>", "<p>a</p>"],
    ["<!-- <script>x</script> -->safe", "safe"],
    ["a < b and c > d", "a &lt; b and c &gt; d"],
    ["<br/>line<hr>", "<br>line<hr>"],
    ["<scr<script>ipt>alert(1)</script>", "&lt;scr"],
    ['<p title="a>b">x</p>', "<p>b\"&gt;x</p>"],
    ["", ""]
  ])("%s", (input, expected) => {
    expect(sanitizeRichText(input)).toBe(expected);
  });

  it("never lets an event handler or script tag through", () => {
    const vectors = [
      '<div/onload=alert(1)>',
      '<details open ontoggle=alert(1)>',
      '<body onload=alert(1)>',
      '<p><a href="https://x" onclick=alert(1)>x</a></p>',
      '"><script>alert(1)</script>'
    ];
    for (const vector of vectors) {
      const output = sanitizeRichText(vector);
      expect(output).not.toMatch(/<script/i);
      expect(output).not.toMatch(/\son\w+\s*=/i);
    }
  });
});
