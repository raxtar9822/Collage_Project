# Patient Validation System - Documentation

## Overview

The Patient Validation System provides comprehensive, multi-layered validation for patient data collection in the hospital meal ordering system. It combines client-side real-time validation with server-side validation to ensure data integrity and provide an excellent user experience.

## Features

### 1. **Client-Side Validation (Real-Time)**
- Instant, non-blocking validation as users type
- Character counting with visual feedback
- Real-time field formatting guidance
- Success/error indications with color coding
- Smooth animations and transitions

### 2. **Server-Side Validation (Security)**
- Prevents invalid data from being stored in the database
- Protects against tampering and malicious input
- Comprehensive error handling with meaningful messages
- Transaction safety and data consistency

### 3. **User-Friendly Interface**
- Simple, intuitive form layout
- Clear section grouping (Patient Details, Room & Ward, Medical Info)
- Helpful hints for each field
- Optional vs. required field indicators
- Error messages with specific guidance

## Form Fields & Validation Rules

### Required Fields

#### Full Name
- **Min Length:** 3 characters
- **Max Length:** 100 characters
- **Pattern:** Letters, spaces, hyphens, apostrophes, and dots only
- **Examples:** "John Smith", "Mary O'Brien", "Jean-Pierre Dubois"

#### Ward
- **Min Length:** 1 character
- **Max Length:** 50 characters
- **Pattern:** Letters, numbers, spaces, and hyphens
- **Examples:** "ICU", "General Ward", "Pediatrics-A"

#### Room Number
- **Min Length:** 1 character
- **Max Length:** 50 characters
- **Pattern:** Letters, numbers, hyphens, slashes, and dots
- **Examples:** "101", "A-5", "ICU/3"

### Optional Fields

#### MRN (Medical Record Number)
- **Min Length:** 3 characters (if provided)
- **Max Length:** 20 characters
- **Pattern:** Uppercase letters, numbers, or hyphens
- **Auto-Generation:** If left empty, system generates "MRN-{timestamp}"
- **Examples:** "MRN-12345", "A-123-B"

#### Dietary Restrictions
- **Max Length:** 500 characters
- **Pattern:** Letters, numbers, spaces, commas, hyphens, and dots
- **Format:** Comma-separated list
- **Examples:** "Vegetarian, Gluten-free", "Low sodium"

#### Known Allergies
- **Max Length:** 500 characters
- **Pattern:** Letters, numbers, spaces, commas, hyphens, and dots
- **Format:** Comma-separated list (critical information)
- **Examples:** "Peanuts, Shellfish", "Penicillin, Latex"

## Validation Flow

### Client-Side Flow (JavaScript)

```
1. User Opens Form
   ↓
2. Page Load Initializer
   ├── Setup character counters
   ├── Initialize field validation
   └── Setup event listeners

3. User Types in Field
   ↓
4. Real-Time Validation
   ├── Character count update
   ├── Pattern validation
   ├── Length validation
   ├── Field error display
   └── Visual feedback (border color, background)

5. Form Submission
   ↓
6. Complete Form Validation
   ├── Validate all required fields
   ├── Aggregate all errors
   ├── Display error summary OR success message
   └── If valid → Submit to server

7. Server Response
   ├── If valid → Redirect to patient list
   └── If invalid → Redisplay form with errors
```

### Server-Side Flow (Node.js)

```
1. POST Request Received
   ↓
2. Extract Form Data
   ├── full_name (required)
   ├── room_number (required)
   ├── ward (required)
   ├── dietary_restrictions (optional)
   ├── allergies (optional)
   └── mrn (optional)

3. Validation Module
   ├── validateFullName()
   ├── validateRoomNumber()
   ├── validateWard()
   ├── validateDietaryRestrictions()
   ├── validateAllergies()
   └── validateMRN()

4. Validation Result
   ├── If invalid → Return errors with form data
   └── If valid → Trim whitespace & create/update patient

5. Database Operation
   ├── INSERT/UPDATE patient record
   ├── Log audit event
   └── Return success or error

6. Response
   ├── If successful → Redirect to /admin/patients
   └── If error → 400/500 with error details
```

## File Structure

```
src/
├── validators.js          # Validation logic and rules
├── server.js              # Express routes with validation
└── db.js                  # Database operations

views/
└── patient_form.ejs       # Form template with client-side validation

public/
├── css/
│   └── styles.css         # Global styles
└── js/
    └── (form validation embedded in EJS)
```

## Implementation Details

### Validators Module (`src/validators.js`)

The `validators.js` module exports:

```javascript
// Validation Functions
- validatePatient(data)            // Complete validation
- validateFullName(fullName)       // Individual field validations
- validateMRN(mrn)
- validateRoomNumber(roomNumber)
- validateWard(ward)
- validateDietaryRestrictions(restrictions)
- validateAllergies(allergies)

// Configuration
- VALIDATION_RULES                 // All validation patterns and limits
```

### Server-Side Validation (`src/server.js`)

POST routes include validation:

```javascript
app.post('/admin/patients/new', requireAuth, requireRole(['admin']), async (req, res) => {
    // 1. Extract form data
    const { full_name, room_number, ward, dietary_restrictions, allergies, mrn } = req.body;
    
    // 2. Validate data
    const validation = validatePatient({ full_name, room_number, ward, ... });
    
    // 3. If invalid, re-render form with errors
    if (!validation.isValid) {
        return res.status(400).render('patient_form', {
            errors: validation.errors,
            formData: req.body,
            validationFailed: true
        });
    }
    
    // 4. If valid, create patient and redirect
    await createPatient({ ... });
    res.redirect('/admin/patients');
});
```

### Client-Side Validation (`views/patient_form.ejs`)

Key JavaScript functions:

```javascript
// Validate single field
validateField(input, fieldName)
// Returns: array of error messages for the field

// Validate entire form
validateForm()
// Returns: boolean (true if all valid)

// Format field names for display
formatFieldName(fieldName)
// Returns: readable field name (e.g., "fullName" → "Full Name")

// Setup character counter
setupCharCounter(input, counterId)
// Updates character count in real-time
```

## Error Messages

### Client-Side Errors

Each field displays specific error messages:
- **Required field empty:** "{Field} is required"
- **Too short:** "Must be at least {n} characters"
- **Too long:** "Must not exceed {n} characters"
- **Invalid pattern:** Specific message about allowed characters

### Server-Side Errors

Comprehensive error object:
```javascript
{
    isValid: false,
    errors: {
        fullName: ["Full name is required"],
        roomNumber: ["Room number must be at least 1 character"],
        ward: ["Ward is required", "Ward pattern is invalid"]
    }
}
```

## Visual Feedback

### Field States

1. **Normal (Empty):**
   - Border: #DDD
   - Background: #FAFAFA

2. **Focused:**
   - Border: #3498DB (blue)
   - Background: #FFF
   - Shadow: Light blue glow

3. **Valid (Green):**
   - Border: #27AE60
   - Background: #F5FEF5
   - Indicates field passes validation

4. **Error (Red):**
   - Border: #E74C3C
   - Background: #FEF5F5
   - Error message displayed below field

### Form-Level Feedback

- **Error Banner:** Red background with error summary
- **Success Message:** Green background when all validations pass
- **Loading State:** Button shows spinner during submission

## Security Considerations

1. **Server-Side Validation:** Always performed, not bypassed by client
2. **SQL Injection Prevention:** Using parameterized queries in database
3. **Input Sanitization:** Trimming whitespace and validating patterns
4. **Role-Based Access:** Only admins can create/edit patients
5. **Audit Logging:** All patient operations are logged

## User Experience Features

1. **Real-Time Feedback:** Immediate validation as user types
2. **Character Counters:** Show remaining characters for text fields
3. **Field Hints:** Helpful text under each field
4. **Required Indicators:** Clear marks for required vs. optional fields
5. **Smart Defaults:** MRN auto-generated if not provided
6. **Form Persistence:** Data retained on validation error
7. **Responsive Design:** Works on mobile, tablet, and desktop

## Testing Validation

### Test Cases - Full Name

```
✗ Empty: "" → Error
✗ Too short: "AB" → Error (need 3+ chars)
✓ Valid: "John Smith" → OK
✓ Valid: "Mary O'Brien" → OK
✓ Valid: "Jean-Pierre" → OK
✗ Invalid: "John123" → Error (numbers not allowed)
✗ Invalid: "John@Smith" → Error (special chars not allowed)
✗ Too long: 101+ characters → Error
```

### Test Cases - Ward

```
✗ Empty: "" → Error
✓ Valid: "ICU" → OK
✓ Valid: "General Ward" → OK
✓ Valid: "Pediatrics-A" → OK
✗ Invalid: "Ward#1" → Error (# not allowed)
```

### Test Cases - Room Number

```
✗ Empty: "" → Error
✓ Valid: "101" → OK
✓ Valid: "A-5" → OK
✓ Valid: "ICU/3" → OK
✓ Valid: "3.A.5" → OK
```

### Test Cases - Optional Fields

```
✓ Empty dietary: "" → OK
✓ Valid dietary: "Vegetarian, Gluten-free" → OK
✓ Empty allergies: "" → OK
✓ Valid allergies: "Peanuts, Shellfish" → OK
```

## API Reference

### validatePatient(data)

**Parameters:**
```javascript
{
    full_name: string,          // Required
    room_number: string,        // Required
    ward: string,               // Required
    dietary_restrictions: string, // Optional
    allergies: string,          // Optional
    mrn: string                 // Optional
}
```

**Returns:**
```javascript
{
    isValid: boolean,
    errors: {
        [fieldName]: [errorMessages]
    }
}
```

**Example:**
```javascript
const result = validatePatient({
    full_name: "John Smith",
    room_number: "101",
    ward: "ICU",
    dietary_restrictions: "Vegetarian",
    allergies: "",
    mrn: ""
});

if (result.isValid) {
    // Proceed with patient creation
} else {
    // Handle validation errors
    console.log(result.errors);
}
```

## Troubleshooting

### Issue: Form validation not triggering

**Solution:** Ensure JavaScript is enabled and the script block in `patient_form.ejs` is loading correctly.

### Issue: Server-side validation bypassed

**Solution:** Verify that `validatePatient()` is being called before `createPatient()` in server.js.

### Issue: Character counter not updating

**Solution:** Check that form Input IDs match the JavaScript references (e.g., `id="fullName"` with `document.getElementById('fullName')`).

### Issue: Validation errors not displaying

**Solution:** Verify that error div IDs follow the pattern `{fieldName}Error` (e.g., `fullNameError`).

## Future Enhancements

1. **Async Validation:** Check MRN uniqueness in database (debounced)
2. **Age/DOB Validation:** If patient birthdate is added
3. **Phone Number Validation:** For emergency contact info
4. **Email Validation:** For future notification system
5. **Duplicate Detection:** Warn if similar patient names exist
6. **Barcode/QR:** MRN generation from barcode scanners
7. **API Integration:** Verify ward names against hospital directory
8. **Internationalization:** Support for multiple languages

## Support

For issues or questions about the validation system:

1. Check this documentation
2. Review `src/validators.js` for validation logic
3. Check browser console for JavaScript errors
4. Review server logs for backend validation errors
5. Test individual fields using the test cases provided

---

**Last Updated:** March 20, 2026
**Version:** 1.0.0
