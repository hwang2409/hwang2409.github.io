# Henry's Personal Website

A minimal, clean personal website built with Next.js and deployed on GitHub Pages.

## Features

- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Minimal Design**: Clean, light interface with focus on content
- **Responsive**: Works well on desktop, tablet, and mobile devices
- **Fast Loading**: Optimized for performance with static export
- **GitHub Pages Ready**: Configured for automatic deployment

## Technologies Used

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS v4
- React 19
- GitHub Actions for CI/CD

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/personal.git
cd personal
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run export` - Build and export static files

## Deployment

### GitHub Pages (Automatic)

1. Push your code to the `main` branch
2. The GitHub Action will automatically build and deploy to GitHub Pages
3. Your site will be available at `https://yourusername.github.io/repository-name`

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. The static files will be in the `out` directory
3. Upload the contents of `out` to your web server

## Customization

### Update Personal Information

Edit the component files in `src/components/`:
- `Hero.tsx` - Name and title
- `About.tsx` - Bio and description
- `Projects.tsx` - Project portfolio
- `Experience.tsx` - Work experience
- `Education.tsx` - Educational background
- `Awards.tsx` - Awards and achievements
- `Contact.tsx` - Contact information and links

### Styling

- Modify Tailwind classes in component files
- Update `src/app/globals.css` for global styles
- The design uses a minimal color palette with grays and blues

### Content Structure

The site is organized into these sections:
- Hero/Introduction
- About
- Skills
- Projects
- Experience
- Education
- Awards
- Contact

## Project Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── components/
    ├── About.tsx
    ├── Awards.tsx
    ├── Contact.tsx
    ├── Education.tsx
    ├── Experience.tsx
    ├── Hero.tsx
    ├── Projects.tsx
    └── Skills.tsx
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is open source and available under the [MIT License](LICENSE).