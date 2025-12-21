# Content Management System Guide

## Overview

The `/content` route in the admin panel allows you to manage static content sections that are displayed on the website. This is a flexible content management system where you can create, edit, and manage reusable content sections.

## How It Works

### Admin Panel (`/content` route)

**Location**: `http://localhost:3001/content`

**Features**:
1. **View All Sections**: Lists all existing content sections
2. **Edit Sections**: Click on any section to edit its content
3. **Create New Sections**: Click "+ New Section" to create a new content section
4. **Fields**:
   - **Section Key**: Unique identifier (e.g., "about", "footer_about", "home_intro")
   - **Title**: Section heading/title
   - **Content**: Main body content (supports HTML/text)

**Database Table**: `static_sections`
- `id` (UUID, primary key)
- `section_key` (text, unique identifier)
- `title` (text, optional)
- `body` (text, main content)
- `image_path` (text, optional - path to image)

### Website Usage

**Function**: `getStaticSection(sectionKey)`
- Fetches content from `static_sections` table by `section_key`
- Returns `null` if section doesn't exist
- Used in server components to fetch content at build/request time

**Current Usage**:
- **About Page** (`/about`): Uses `getStaticSection('about')` to display the main story/content

## How to Use

### Step 1: Create/Edit Content in Admin Panel

1. Go to `http://localhost:3001/content`
2. Click on an existing section to edit, or click "+ New Section" to create new
3. Fill in:
   - **Section Key**: Choose a unique identifier (e.g., "about", "home_welcome", "contact_info")
   - **Title**: Section title (optional)
   - **Content**: Your content (supports HTML)
4. Click "Save Section"

### Step 2: Use on Website

In any page component, import and use:

```typescript
import { getStaticSection } from '@/lib/queries'

export default async function MyPage() {
  const mySection = await getStaticSection('my_section_key')
  
  return (
    <div>
      <h1>{mySection?.title || 'Default Title'}</h1>
      <div dangerouslySetInnerHTML={{ __html: mySection?.body || 'Default content' }} />
    </div>
  )
}
```

## Current Sections

### 1. **About Section** (`section_key: "about"`)
- **Used On**: `/about` page
- **Displays**: Main story/content about the restaurant
- **Fields**: title, body, image_path (optional)

## Creating New Sections

### Example: Create a "Home Welcome" Section

1. **In Admin Panel** (`/content`):
   - Click "+ New Section"
   - Section Key: `home_welcome`
   - Title: `Welcome to Good Times`
   - Content: `Your welcome message here...`
   - Save

2. **On Website** (e.g., home page):
   ```typescript
   const welcomeSection = await getStaticSection('home_welcome')
   ```

3. **Display**:
   ```tsx
   {welcomeSection && (
     <div>
       <h2>{welcomeSection.title}</h2>
       <div dangerouslySetInnerHTML={{ __html: welcomeSection.body }} />
     </div>
   )}
   ```

## Section Key Naming Convention

Use descriptive, lowercase keys with underscores:
- ✅ `about` - About page content
- ✅ `home_welcome` - Home page welcome section
- ✅ `footer_about` - Footer about section
- ✅ `contact_info` - Contact information
- ✅ `privacy_policy` - Privacy policy content
- ❌ `About` - Avoid uppercase
- ❌ `home-welcome` - Use underscores, not hyphens

## Content Formatting

The `body` field supports:
- **Plain Text**: Will be displayed as-is
- **HTML**: Can include HTML tags for formatting
- **Line Breaks**: Use `<br />` or wrap in `<p>` tags

**Example HTML Content**:
```html
<p>Welcome to Good Times Bar & Grill!</p>
<p>We offer:</p>
<ul>
  <li>Great food</li>
  <li>Live music</li>
  <li>Amazing atmosphere</li>
</ul>
```

## Database Schema

```sql
CREATE TABLE static_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  title TEXT,
  body TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Best Practices

1. **Use Descriptive Keys**: Make section keys clear and descriptive
2. **Keep Content Updated**: Regularly update content to keep it fresh
3. **Use HTML Wisely**: Format content with HTML for better presentation
4. **Test on Website**: After saving, check the website to see changes
5. **Fallback Content**: Always provide fallback content in case section doesn't exist

## Troubleshooting

### Section Not Showing on Website
- Check if `section_key` matches exactly (case-sensitive)
- Verify section exists in database
- Check browser console for errors
- Ensure `getStaticSection()` is called correctly

### Content Not Updating
- Clear browser cache
- Check if changes were saved in admin panel
- Verify database has latest content
- Restart development server if needed

## Future Enhancements

Potential improvements:
- Image upload for sections
- Rich text editor (WYSIWYG)
- Multiple language support
- Content versioning/history
- Preview before publishing
- Scheduled publishing

