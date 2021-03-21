const { test, __newString, __getString } = require('..');

const html = `
<!DOCTYPE html>
<html lang="en">
  <body>
    <input type="text" disabled="disabled">
  </body>
</html>
`;

test(__newString(html));
