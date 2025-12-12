import express from 'express';
const app = express();

// Example metadata for different paths
const metadataMap = {
  '/': {
    title: 'DropLink Home',
    description: 'Welcome to DropLink on PiNet!',
    openGraph: {
      type: 'website',
      title: 'DropLink Home',
      description: 'Welcome to DropLink on PiNet!',
      images: [
        {
          url: 'https://droplink2920.pinet.com/og-image.png',
          alt: 'DropLink Logo',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'DropLink Home',
      description: 'Welcome to DropLink on PiNet!',
      images: [
        {
          url: 'https://droplink2920.pinet.com/twitter-image.png',
          alt: 'DropLink Logo',
        },
      ],
    },
  },
  // Add more path-specific metadata as needed
};

app.get('/pinet/meta', (req, res) => {
  const pathname = req.query.pathname || '/';
  const meta = metadataMap[pathname] || metadataMap['/'];
  res.json(meta);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PiNet metadata server running on port ${PORT}`);
});
