const sharp = require('sharp');

sharp('public/profile-photo.png')
  .toFormat('avif')
  .toFile('public/profile-photo.avif')
  .then(() => {
    console.log('Image converted to AVIF!');
  })
  .catch((err) => {
    console.error(err);
  });
