# MessagePopup Component

This folder contains the MessagePopup component, a notification/toast-style popup that displays messages to users with different styling based on message type.

## Component Overview

The MessagePopup is a notification component that appears at the top center of the screen. It supports three message types (error, success, standard) with distinct styling, and automatically dismisses after a configurable duration.

## Usage

### Basic Import

```jsx
import MessagePopup from "./components/messagePopup/MessagePopup";
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | Required | The main message text to display |
| `subtitle` | `string` | `""` | Optional subtitle text displayed below the message |
| `visible` | `boolean` | `false` | Controls whether the popup is visible |
| `type` | `"error" \| "success" \| "standard"` | `"standard"` | Message type that determines styling |
| `onClose` | `function` | `undefined` | Callback function called when popup closes (auto-dismiss or manual) |
| `autoHideDuration` | `number` | `3000` | Duration in milliseconds before auto-dismissing (0 to disable) |

### Example Implementation

```jsx
import { useState } from "react";
import MessagePopup from "./components/messagePopup/MessagePopup";

function App() {
  const [messagePopup, setMessagePopup] = useState({
    visible: false,
    message: "",
    subtitle: "",
    type: "standard",
  });

  // Method to show message popup
  const showMessage = (message, subtitle = "", type = "standard", duration = 3000) => {
    setMessagePopup({
      visible: true,
      message,
      subtitle,
      type,
    });
  };

  const hideMessage = () => {
    setMessagePopup((prev) => ({ ...prev, visible: false }));
  };

  return (
    <>
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        onClose={hideMessage}
      />
      
      {/* Example usage */}
      <button onClick={() => showMessage("Success!", "Operation completed", "success")}>
        Show Success
      </button>
      <button onClick={() => showMessage("Error", "Something went wrong", "error")}>
        Show Error
      </button>
      <button onClick={() => showMessage("Info", "This is a message", "standard")}>
        Show Standard
      </button>
    </>
  );
}
```

## Message Types

### Error (`type="error"`)
- **Background**: Dark red (`bg-red-900/90`)
- **Border**: Red (`border-red-500`)
- **Text**: Light red (`text-red-200`)
- **Title**: Medium red (`text-red-300`)
- **Use case**: Display error messages, validation failures, or critical issues

### Success (`type="success"`)
- **Background**: Dark green (`bg-green-900/90`)
- **Border**: Green (`border-green-500`)
- **Text**: Light green (`text-green-200`)
- **Title**: Medium green (`text-green-300`)
- **Use case**: Display success messages, confirmations, or positive feedback

### Standard (`type="standard"`)
- **Background**: Brand black (`bg-BrandBlack2`)
- **Border**: Brand orange (`border-BrandOrange`)
- **Text**: Brand orange (`text-BrandOrange`)
- **Title**: Brand orange (`text-BrandOrange`)
- **Use case**: Display general information, neutral messages, or default notifications

## Features

### Auto-Dismiss
- The popup automatically hides after `autoHideDuration` milliseconds (default: 3000ms)
- Set `autoHideDuration={0}` to disable auto-dismiss
- The `onClose` callback is triggered when the popup auto-dismisses

### Manual Control
- Control visibility via the `visible` prop
- Call `onClose` to manually hide the popup
- The component uses internal state to manage visibility transitions

### Responsive Design
- Responsive padding: `p-2 sm:p-2.5`
- Responsive minimum width: `min-w-[150px] sm:min-w-[200px]`
- Responsive text sizes for both message and subtitle
- Maximum width constraint: `max-w-[90vw]` to prevent overflow on small screens

### Positioning
- Absolutely positioned at top center of screen
- Uses `top-[10px] left-1/2 -translate-x-1/2` for centering
- High z-index (`z-[100]`) to appear above other content

## Styling Details

### Layout
- Flex column layout with centered items
- Rounded corners (`rounded-md`)
- Shadow effect (`shadow-lg`)
- Smooth opacity transitions (`transition-opacity duration-300`)

### Typography
- **Message (h2)**: 
  - Size: `text-xs sm:text-sm`
  - Weight: `font-semibold`
  - Font: `font-DmSans`
  - Margin bottom: `mb-0.5`
- **Subtitle (p)**:
  - Size: `text-[10px] sm:text-xs`
  - Font: `font-DmSans`
  - Only rendered if `subtitle` prop is provided

## Best Practices

1. **Keep messages concise**: The popup has limited space, especially on mobile devices
2. **Use appropriate types**: Match the message type to the content (error for errors, success for successes)
3. **Provide subtitles for context**: Use the subtitle prop to add additional context without cluttering the main message
4. **Handle multiple messages**: If showing multiple messages in sequence, ensure proper state management to avoid overlapping popups
5. **Accessibility**: The component uses semantic HTML (`h2` for message, `p` for subtitle) for screen readers

## Integration with App State

The MessagePopup is typically integrated into the main App component with state management:

```jsx
// State structure
const [messagePopup, setMessagePopup] = useState({
  visible: false,
  message: "",
  subtitle: "",
  type: "standard",
});

// Helper function to show messages
const showMessage = (message, subtitle = "", type = "standard", duration = 3000) => {
  setMessagePopup({
    visible: true,
    message,
    subtitle,
    type,
  });
};

// Helper function to hide messages
const hideMessage = () => {
  setMessagePopup((prev) => ({ ...prev, visible: false }));
};
```

This pattern allows you to call `showMessage()` from anywhere in your app (via props or context) to display notifications.

## Notes

- The component returns `null` when not visible, so it doesn't render anything in the DOM
- The internal `isVisible` state is synced with the `visible` prop to handle smooth transitions
- The auto-dismiss timer is cleaned up properly when the component unmounts or when visibility changes
- All styling uses Tailwind CSS classes with responsive breakpoints
