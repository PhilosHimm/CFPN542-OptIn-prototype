# General guidelines

*   **CFPN542 Rubric Focus:** All generated UI must be high-fidelity, mobile-first, and strictly adhere to Material Design 3 (M3) guidelines. 
*   **Accessibility First:** Ensure high color contrast (minimum 4.5:1 for text). All interactive touch targets must be at least 48x48dp to meet mobile accessibility standards.
*   **App Context (OptIn):** The app is a consensus-based scheduling tool for recreational pickup sports (basketball, soccer, volleyball) targeting athletes aged 18-45. The UI should feel energetic, organized, and democratic.
*   **Layout:** Opt for responsive, well-structured layouts using an 8pt grid system. Standard screen padding should be 16dp on the left and right.

--------------

# Design system guidelines

*   **Base Typography:** Use the Material 3 default (Roboto or system sans-serif). Base body size is 14pt (Body Medium), headlines should be bold and clear (Headline Small/Medium).
*   **Brand Colors:** 
    *   Primary Color: Turf Green (`#2D7A3A` or similar)
    *   Surface/Background: Clean White (`#FFFFFF`) or off-white for contrast.
    *   Error/Warning: Standard M3 Red (`#B3261E`).
*   **Corner Radius:** Cards and buttons should use M3 standard rounded corners (12px or 16px).
*   **Navigation Limitations:** The Bottom Navigation Bar should have exactly 4 items (Home, Calendar, Chat, Profile). 

## Button
The Button component is crucial for getting users to RSVP, vote, and schedule games. It must provide clear affordances and follow M3 hierarchy.

### Variants
*   **Extended FAB (Floating Action Button)**
    *   *Purpose:* The most important global action.
    *   *Visual Style:* Pill-shaped, floating in the bottom-right corner, filled with Turf Green, includes an icon (e.g., '+') and text.
    *   *Usage:* Use exclusively for the "Create Game" wizard trigger on the Home and Calendar screens.
*   **Primary Button (Filled)**
    *   *Purpose:* Main action within a specific card, screen, or modal.
    *   *Visual Style:* Fully filled with Turf Green, white text, 12px corner radius.
    *   *Usage:* "Confirm Vote", "RSVP", "Send Message".
*   **Secondary Button (Tonal / Outlined)**
    *   *Purpose:* Alternative actions.
    *   *Visual Style:* Tonal (light green fill, dark green text) or Outlined (border only).
    *   *Usage:* "View Roster", "Edit Profile", "Cancel".

## Cards
Cards are the primary way we display game information and voting options to users.

### Variants
*   **Elevated Card**
    *   *Purpose:* To display upcoming confirmed games on the Home Screen.
    *   *Visual Style:* White background, subtle drop shadow (M3 Elevation Level 1), 16px corner radius.
*   **Outlined Card**
    *   *Purpose:* Used for the consensus/voting screen to show different proposed game times.
    *   *Visual Style:* 1px gray border, no shadow. 
    *   *Interaction:* When a user selects a time to vote, the outline should change to Turf Green and the background should get a 5% green tint.

## Navigation & Menus
Navigation must be intuitive and consistent to score high on the "Navigation and Flow" rubric.

*   **Bottom Navigation Bar:** Use the M3 pill-shaped active indicator. The active tab should have a Turf Green pill background behind the icon to clearly show the user where they are.
*   **Tabs:** Use M3 horizontal tabs at the top of the Home Screen to filter by sport (e.g., "All", "Basketball", "Soccer", "Volleyball").
*   **Bottom Sheet:** For the "Create Game Wizard", do not navigate to a new page. Instead, slide up an M3 Bottom Sheet over the current screen to keep the user anchored.

## Data Entry & Voting (Forms)
*   **Text Fields:** Use M3 Outlined Text Fields for chat inputs, game names, and location searches. 
*   **Filter Chips:** Use rounded chips for selecting player skill levels or game tags (e.g., "Casual", "Competitive").
*   **Voting Mechanics:** For the game voting screen, display options using a Radio Button list housed inside Outlined Cards, prominently displaying the current vote count next to each option.
