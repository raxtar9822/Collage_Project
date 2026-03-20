/**
 * Patient Validation Module
 * Provides comprehensive validation for patient data
 */

const VALIDATION_RULES = {
	fullName: {
		minLength: 3,
		maxLength: 100,
		pattern: /^[a-zA-Z\s'-\.]+$/,
		message: 'Name must contain letters, spaces, hyphens, apostrophes, or dots'
	},
	mrn: {
		minLength: 3,
		maxLength: 20,
		pattern: /^[A-Z0-9\-]+$/,
		message: 'MRN must contain uppercase letters, numbers, or hyphens'
	},
	roomNumber: {
		minLength: 1,
		maxLength: 50,
		pattern: /^[A-Z0-9\-\/\.]+$/,
		message: 'Room number must contain letters, numbers, or standard separators'
	},
	ward: {
		minLength: 1,
		maxLength: 50,
		pattern: /^[a-zA-Z0-9\s\-]+$/,
		message: 'Ward must contain letters, numbers, spaces, or hyphens'
	},
	dietaryRestrictions: {
		maxLength: 500,
		pattern: /^[a-zA-Z0-9\s,\-\.]*$/,
		message: 'Dietary restrictions can contain letters, numbers, and commas'
	},
	allergies: {
		maxLength: 500,
		pattern: /^[a-zA-Z0-9\s,\-\.]*$/,
		message: 'Allergies can contain letters, numbers, and commas'
	}
};

/**
 * Validate full name
 */
function validateFullName(fullName) {
	const errors = [];
	
	if (!fullName || !fullName.trim()) {
		errors.push('Full name is required');
		return errors;
	}
	
	const trimmed = fullName.trim();
	
	if (trimmed.length < VALIDATION_RULES.fullName.minLength) {
		errors.push(`Name must be at least ${VALIDATION_RULES.fullName.minLength} characters`);
	}
	
	if (trimmed.length > VALIDATION_RULES.fullName.maxLength) {
		errors.push(`Name must not exceed ${VALIDATION_RULES.fullName.maxLength} characters`);
	}
	
	if (!VALIDATION_RULES.fullName.pattern.test(trimmed)) {
		errors.push(VALIDATION_RULES.fullName.message);
	}
	
	return errors;
}

/**
 * Validate MRN (Medical Record Number)
 */
function validateMRN(mrn) {
	const errors = [];
	
	// MRN is optional - will be auto-generated if not provided
	if (!mrn || !mrn.trim()) {
		return errors;
	}
	
	const trimmed = mrn.trim();
	
	if (trimmed.length < VALIDATION_RULES.mrn.minLength) {
		errors.push(`MRN must be at least ${VALIDATION_RULES.mrn.minLength} characters`);
	}
	
	if (trimmed.length > VALIDATION_RULES.mrn.maxLength) {
		errors.push(`MRN must not exceed ${VALIDATION_RULES.mrn.maxLength} characters`);
	}
	
	if (!VALIDATION_RULES.mrn.pattern.test(trimmed)) {
		errors.push(VALIDATION_RULES.mrn.message);
	}
	
	return errors;
}

/**
 * Validate room number
 */
function validateRoomNumber(roomNumber) {
	const errors = [];
	
	if (!roomNumber || !roomNumber.trim()) {
		errors.push('Room number is required');
		return errors;
	}
	
	const trimmed = roomNumber.trim();
	
	if (trimmed.length < VALIDATION_RULES.roomNumber.minLength) {
		errors.push(`Room number must be at least ${VALIDATION_RULES.roomNumber.minLength} character`);
	}
	
	if (trimmed.length > VALIDATION_RULES.roomNumber.maxLength) {
		errors.push(`Room number must not exceed ${VALIDATION_RULES.roomNumber.maxLength} characters`);
	}
	
	if (!VALIDATION_RULES.roomNumber.pattern.test(trimmed)) {
		errors.push(VALIDATION_RULES.roomNumber.message);
	}
	
	return errors;
}

/**
 * Validate ward
 */
function validateWard(ward) {
	const errors = [];
	
	if (!ward || !ward.trim()) {
		errors.push('Ward is required');
		return errors;
	}
	
	const trimmed = ward.trim();
	
	if (trimmed.length < VALIDATION_RULES.ward.minLength) {
		errors.push(`Ward must be at least ${VALIDATION_RULES.ward.minLength} character`);
	}
	
	if (trimmed.length > VALIDATION_RULES.ward.maxLength) {
		errors.push(`Ward must not exceed ${VALIDATION_RULES.ward.maxLength} characters`);
	}
	
	if (!VALIDATION_RULES.ward.pattern.test(trimmed)) {
		errors.push(VALIDATION_RULES.ward.message);
	}
	
	return errors;
}

/**
 * Validate dietary restrictions
 */
function validateDietaryRestrictions(restrictions) {
	const errors = [];
	
	// Optional field
	if (!restrictions || !restrictions.trim()) {
		return errors;
	}
	
	const trimmed = restrictions.trim();
	
	if (trimmed.length > VALIDATION_RULES.dietaryRestrictions.maxLength) {
		errors.push(`Dietary restrictions must not exceed ${VALIDATION_RULES.dietaryRestrictions.maxLength} characters`);
	}
	
	if (!VALIDATION_RULES.dietaryRestrictions.pattern.test(trimmed)) {
		errors.push(VALIDATION_RULES.dietaryRestrictions.message);
	}
	
	return errors;
}

/**
 * Validate allergies
 */
function validateAllergies(allergies) {
	const errors = [];
	
	// Optional field
	if (!allergies || !allergies.trim()) {
		return errors;
	}
	
	const trimmed = allergies.trim();
	
	if (trimmed.length > VALIDATION_RULES.allergies.maxLength) {
		errors.push(`Allergies must not exceed ${VALIDATION_RULES.allergies.maxLength} characters`);
	}
	
	if (!VALIDATION_RULES.allergies.pattern.test(trimmed)) {
		errors.push(VALIDATION_RULES.allergies.message);
	}
	
	return errors;
}

/**
 * Comprehensive patient validation
 */
function validatePatient(data) {
	const errors = {};
	
	const fullNameErrors = validateFullName(data.full_name);
	if (fullNameErrors.length > 0) errors.fullName = fullNameErrors;
	
	const mrnErrors = validateMRN(data.mrn);
	if (mrnErrors.length > 0) errors.mrn = mrnErrors;
	
	const roomErrors = validateRoomNumber(data.room_number);
	if (roomErrors.length > 0) errors.roomNumber = roomErrors;
	
	const wardErrors = validateWard(data.ward || '');
	if (wardErrors.length > 0) errors.ward = wardErrors;
	
	const dietaryErrors = validateDietaryRestrictions(data.dietary_restrictions);
	if (dietaryErrors.length > 0) errors.dietaryRestrictions = dietaryErrors;
	
	const allergyErrors = validateAllergies(data.allergies);
	if (allergyErrors.length > 0) errors.allergies = allergyErrors;
	
	return {
		isValid: Object.keys(errors).length === 0,
		errors
	};
}

module.exports = {
	validatePatient,
	validateFullName,
	validateMRN,
	validateRoomNumber,
	validateWard,
	validateDietaryRestrictions,
	validateAllergies,
	VALIDATION_RULES
};
