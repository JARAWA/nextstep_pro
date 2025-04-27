/**
 * Exam service for handling exam-related data and UI
 */
import UserService from './user-service.js';
import { Validator, validateForm } from '../utils/validation.js';
import { ErrorHandler } from '../utils/error-handler.js';

class ExamService {
    // Define standard exam data structure
    static examFieldConfigs = {
        hasJeeMain: {
            id: 'jeeMainRank',
            label: 'JEE Main Rank',
            placeholder: 'Enter your JEE Main rank'
        },
        hasJeeAdvanced: {
            id: 'jeeAdvancedRank',
            label: 'JEE Advanced Rank',
            placeholder: 'Enter your JEE Advanced rank'
        },
        hasMhtcet: {
            id: 'mhtcetRank',
            label: 'MHT-CET Rank',
            placeholder: 'Enter your MHT-CET rank'
        },
        hasNeet: {
            id: 'neetRank',
            label: 'NEET-UG Rank',
            placeholder: 'Enter your NEET-UG rank'
        }
    };
    
    /**
     * Initialize exam form handling
     */
    static init() {
        this.setupDynamicExamFields();
        
        // Add event listener for exam data form if it exists
        const examDataForm = document.getElementById('exam-data-form');
        if (examDataForm) {
            examDataForm.addEventListener('submit', (e) => this.handleExamDataForm(e));
        }
    }
    
    /**
     * Set up dynamic exam checkboxes and fields
     */
    static setupDynamicExamFields() {
        const examCheckboxes = document.querySelectorAll('.exam-checkbox');
        const dynamicRankFields = document.getElementById('dynamicRankFields');
        
        if (!examCheckboxes || !dynamicRankFields) return;
        
        // Initial render based on defaults
        this.renderDynamicFields(examCheckboxes, dynamicRankFields, this.examFieldConfigs);
        
        // Update fields on checkbox changes
        examCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.renderDynamicFields(examCheckboxes, dynamicRankFields, this.examFieldConfigs);
            });
        });
        
        // Populate fields with existing data
        this.populateExamFields();
    }
    
    /**
     * Render dynamic rank fields based on selected exams
     * @param {NodeList} checkboxes - Collection of exam checkboxes
     * @param {HTMLElement} container - Container for rank fields
     * @param {Object} fieldConfigs - Field configuration data
     */
    // In exam-service.js, modify the renderDynamicFields method:
static renderDynamicFields(checkboxes, container, fieldConfigs) {
    console.log("renderDynamicFields - Rendering fields for", checkboxes.length, "checkboxes");
    container.innerHTML = '';
    
    checkboxes.forEach(checkbox => {
        console.log(`renderDynamicFields - Checkbox ${checkbox.id} checked: ${checkbox.checked}`);
        if (checkbox.checked) {
            const fieldConfig = fieldConfigs[checkbox.id];
            if (fieldConfig) {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'form-group rank-field active';
                fieldDiv.innerHTML = `
                    <label for="${fieldConfig.id}">${fieldConfig.label}*</label>
                    <input type="number" id="${fieldConfig.id}" placeholder="${fieldConfig.placeholder}" required>
                    <div id="${fieldConfig.id}Error" class="error-message"></div>
                `;
                container.appendChild(fieldDiv);
                console.log(`renderDynamicFields - Created field for ${fieldConfig.id}`);
            } else {
                console.log(`renderDynamicFields - No field config found for ${checkbox.id}`);
            }
        }
    });
    
    // Log all created input fields
    container.querySelectorAll('input').forEach(input => {
        console.log(`renderDynamicFields - Created input with id: ${input.id}`);
    });
}
    
    /**
     * Update exam data in Firestore
     * @param {Object} user - Firebase user object
     * @param {Object} examUpdates - Exam data to update
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async updateExamData(user, examUpdates) {
        if (!user) {
            if (window.showToast) {
                window.showToast('You must be logged in to update exam data', 'error');
            }
            return false;
        }
        
        try {
            // Get current user data to merge with updates
            const userData = await UserService.getUserData(user);
            if (!userData) {
                throw new Error('User profile not found');
            }
            
            const currentExamData = userData.examData || {};
            
            // Merge current exam data with updates
            const updatedExamData = {
                ...currentExamData,
                ...examUpdates
            };
            
            // Update only the examData field and lastUpdated timestamp
            const success = await UserService.updateUserProfile(user, {
                examData: updatedExamData
            });
            
            if (success) {
                console.log("Exam data updated successfully:", updatedExamData);
                
                if (window.showToast) {
                    window.showToast('Exam information updated successfully', 'success');
                }
                
                return true;
            } else {
                throw new Error('Failed to update user profile');
            }
        } catch (error) {
            console.error("Error updating exam data:", error);
            
            if (window.showToast) {
                window.showToast('Failed to update exam information', 'error');
            }
            
            return false;
        }
    }
    
    /**
     * Handle exam data form submission
     * @param {Event} event - Form submission event
     */
    static async handleExamDataForm(event, user) {
        event.preventDefault();
        
        const examCheckboxes = document.querySelectorAll('.exam-checkbox:checked');
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        // Validate all exam rank inputs
        const examRankValidations = Array.from(examCheckboxes).map(checkbox => {
            const examType = checkbox.id.replace('has', '');
            const fieldId = examType + 'Rank';
            const rankInput = document.getElementById(fieldId);
            
            if (!rankInput) return null;
            
            return {
                element: rankInput,
                value: rankInput.value.trim(),
                validator: (value) => ({
                    isValid: /^\d+$/.test(value) && parseInt(value) > 0,
                    error: `Please enter a valid ${examType} rank number`
                }),
                errorField: `${fieldId}Error`,
                displayError: ErrorHandler.displayError
            };
        }).filter(Boolean);
        
        if (examRankValidations.length > 0 && !validateForm(examRankValidations)) {
            return;
        }
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            
            // Collect exam data from selected exams and their rank fields
            const examData = {};
            examCheckboxes.forEach(checkbox => {
                const examType = checkbox.id.replace('has', '');
                const fieldId = examType + 'Rank';
                const rankInput = document.getElementById(fieldId);
                
                if (rankInput && rankInput.value.trim()) {
                    examData[examType] = {
                        rank: parseInt(rankInput.value.trim()),
                        verified: false,
                        dateUpdated: new Date().toISOString()
                    };
                }
            });
            
            // Update exam data in Firestore
            await this.updateExamData(user, examData);
            
        } catch (error) {
            console.error("Error updating exam data:", error);
            
            if (window.showToast) {
                window.showToast('Failed to update exam information', 'error');
            }
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
    
    /**
     * Populate exam fields with user's existing data
     * @param {Object} user - Firebase user object
     */
    static async populateExamFields(user) {
        if (!user) return;
        
        try {
            // Fetch user data
            const userData = await UserService.getUserData(user);
            if (!userData || !userData.examData) return;
            
            const examData = userData.examData;
            
            // For each exam type in the user's data, check the corresponding checkbox
            // and populate the rank field
            Object.keys(examData).forEach(examType => {
                const checkboxId = 'has' + examType;
                const checkbox = document.getElementById(checkboxId);
                
                if (checkbox) {
                    // Check the box
                    checkbox.checked = true;
                    
                    // Trigger the change event to render the field
                    const changeEvent = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(changeEvent);
                    
                    // Wait for the field to render, then populate it
                    setTimeout(() => {
                        const rankInputId = examType + 'Rank';
                        const rankInput = document.getElementById(rankInputId);
                        
                        if (rankInput && examData[examType].rank) {
                            rankInput.value = examData[examType].rank;
                        }
                    }, 100);
                }
            });
        } catch (error) {
            console.error("Error populating exam fields:", error);
        }
    }
    
    /**
     * Collect exam data from enhanced signup form
     * @returns {Object} Collected exam data
     */
static collectExamDataFromForm() {
    // First, log all exam-related inputs in the document
    console.log("All input fields in the form:");
    document.querySelectorAll('input[type="number"]').forEach(input => {
        console.log(`Input field: ${input.id}, value: ${input.value}`);
    });
    
    const examCheckboxes = document.querySelectorAll('.exam-checkbox:checked');
    console.log("collectExamDataFromForm - Number of checked exam checkboxes:", examCheckboxes.length);
    
    const examData = {};
    
    examCheckboxes.forEach(checkbox => {
        const examType = checkbox.id.replace('has', '');
        const fieldId = examType + 'Rank';
        
        // Try getting the input element by direct selector instead of getElementById
        const rankInput = document.querySelector(`#signupStep2Form #${fieldId}`) || 
                          document.querySelector(`input[id="${fieldId}"]`) ||
                          document.getElementById(fieldId);
        
        console.log(`collectExamDataFromForm - Processing ${examType}: input exists: ${!!rankInput}, value: ${rankInput ? rankInput.value : 'none'}`);
        
        if (rankInput && rankInput.value.trim()) {
            examData[examType] = {
                rank: parseInt(rankInput.value.trim()),
                dateAdded: new Date().toISOString()
            };
            console.log(`collectExamDataFromForm - Added ${examType} with rank ${rankInput.value.trim()}`);
        } else {
            // Find the input by inspecting all inputs
            const allInputs = document.querySelectorAll('input[type="number"]');
            console.log(`Looking for ${fieldId} among ${allInputs.length} number inputs`);
            
            allInputs.forEach(input => {
                if (input.id.includes(examType.toLowerCase()) || input.id.includes(fieldId.toLowerCase())) {
                    console.log(`Found potential match: ${input.id} with value: ${input.value}`);
                    if (input.value.trim()) {
                        examData[examType] = {
                            rank: parseInt(input.value.trim()),
                            dateAdded: new Date().toISOString()
                        };
                        console.log(`collectExamDataFromForm - Added ${examType} with rank ${input.value.trim()} (found via alternative search)`);
                    }
                }
            });
        }
    });
    
    console.log("collectExamDataFromForm - Final examData:", JSON.stringify(examData));
    return examData;
}
    
    /**
     * Validate exam form fields
     * @returns {boolean} Whether validation passed
     */
    static validateExamFields() {
        const examCheckboxes = document.querySelectorAll('.exam-checkbox:checked');
        const examValidations = Array.from(examCheckboxes).map(checkbox => {
            const examType = checkbox.id.replace('has', '');
            const fieldId = examType + 'Rank';
            const rankInput = document.getElementById(fieldId);
            
            if (!rankInput) return null;
            
            return {
                element: rankInput,
                value: rankInput.value.trim(),
                validator: (value) => ({
                    isValid: /^\d+$/.test(value) && parseInt(value) > 0,
                    error: `Please enter a valid ${examType} rank number`
                }),
                errorField: `${fieldId}Error`,
                displayError: ErrorHandler.displayError
            };
        }).filter(Boolean);
        
        if (examValidations.length > 0) {
            return validateForm(examValidations);
        }
        
        return true;
    }
}

export default ExamService;
