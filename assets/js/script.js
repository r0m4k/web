/**
 * Main JavaScript file for the personal portfolio website
 * 
 * This file contains all the functionality for:
 * - Dynamic HTML loading (navbar and footer)
 * - Theme toggling with localStorage persistence
 * - Active navigation link highlighting
 * - Fractal tree canvas animation for the About page
 * - Project carousel with custom styling
 * - Contact form error handling
 * - Task management system with filtering and CRUD operations
 * - Activity display on About page
 * 
 * Dependencies:
 * - jQuery 3.7.1+
 * - Bootstrap 5.x
 * 
 * @author Roman Dolgopolyi
 * @version 2.0.0
 * @since 2025-06-22
 */

/**
 * Asynchronously loads HTML content from a URL and inserts it into a specified element
 * @param {string} url - The URL to fetch HTML content from
 * @param {string} elementId - The ID of the element where the HTML will be inserted
 * @param {Function|null} callback - Optional callback function to execute after successful loading
 * @returns {Promise<void>} Promise that resolves when the operation completes
 */
async function loadHTML(url, elementId, callback) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to load ${url}: ${response.statusText}`);
            const $placeholder = $(`#${elementId}`);
            if($placeholder.length) $placeholder.html(`<p class="text-danger text-center">Error: Could not load content for this section.</p>`);
            return;
        }
        const html = await response.text();
        const $placeholder = $(`#${elementId}`);
        if ($placeholder.length) {
            $placeholder.html(html);
            if (callback) {
                callback();
            }
        } else {
            console.error(`Placeholder element with ID '${elementId}' not found.`);
        }
    } catch (error) {
        console.error(`Error loading HTML from ${url}:`, error);
        const $placeholder = $(`#${elementId}`);
        if($placeholder.length) $placeholder.html(`<p class="text-danger text-center">Error: Could not load content: ${error.message}.</p>`);
    }
}

/**
 * Initializes features that depend on the navbar being loaded.
 * This includes the theme toggler and active link highlighting.
 * @returns {void}
 */
function initializeNavbarFeatures() {
    // --- Theme Toggler ---
    const $themeToggler = $('#theme-toggler');
    const $htmlElement = $(document.documentElement);

    if ($themeToggler.length && $htmlElement.length) {
        const $themeIcon = $themeToggler.find('i');
        if (!$themeIcon.length) {
            console.error("Theme icon not found within the theme toggler.");
            // Fallback or error display can be added here
        }

        /**
         * Sets the application theme and updates the UI accordingly
         * @param {string} theme - The theme to set ('dark' or 'light')
         */
        const setTheme = (theme) => {
            $htmlElement.attr('data-bs-theme', theme);
            if ($themeIcon.length) {
                if (theme === 'dark') {
                    $themeIcon.removeClass('bi-braces').addClass('bi-braces-asterisk');
                } else {
                    $themeIcon.removeClass('bi-braces-asterisk').addClass('bi-braces');
                }
            }
            localStorage.setItem('theme', theme);
        };

        $themeToggler.on('click', () => {
            const currentTheme = $htmlElement.attr('data-bs-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });

        const savedTheme = localStorage.getItem('theme');
        const initialHtmlTheme = $htmlElement.attr('data-bs-theme') || 'light';
        setTheme(savedTheme || initialHtmlTheme); // Apply saved theme or initial HTML theme

    } else {
        if (!$themeToggler.length) console.warn("Theme toggler button (id: theme-toggler) not found.");
        if (!$htmlElement.length) console.warn("HTML element not found for theme toggler.");
    }

    // --- Active Nav Link ---
    const $navLinks = $('.navbar-nav .nav-link'); // Query within the loaded navbar
    if ($navLinks.length > 0) {
        const currentPageFileName = window.location.pathname.split("/").pop();
        // Normalize for root path or index.html to both match 'index.html' href
        const currentNormalizedPage = (currentPageFileName === '' || currentPageFileName === 'index.html') ? 'index.html' : currentPageFileName;

        $navLinks.each(function() {
            const $link = $(this);
            const linkHref = $link.attr('href');
            if (linkHref === currentNormalizedPage) {
                $link.addClass('active');
            } else {
                $link.removeClass('active');
            }
        });
    } else {
        // This might happen briefly before navbar is fully processed or if selector is wrong
        // console.warn("No navigation links found for active link highlighting. This might be a timing issue or an error.");
    }

    // --- Navbar Dropdown Close on Outside Click ---
    const $navbarCollapse = $('#navbarNav');
    
    if ($navbarCollapse.length) {
        $(document).on('click.navbar-outside', function(event) {
            if ($navbarCollapse.hasClass('show') && !$(event.target).closest('.navbar').length) {
                const bsCollapse = bootstrap.Collapse.getInstance($navbarCollapse[0]);
                if (bsCollapse) {
                    bsCollapse.hide();
                }
            }
        });
    }
}

/**
 * Draws a randomly generated fractal tree on a canvas element with a growth animation.
 * The tree's appearance is influenced by the current color scheme (light/dark).
 * @returns {void}
 */
function drawFractalTreeOnAboutPage() {
    const $canvas = $('#fractal-tree-canvas');
    if (!$canvas.length) {
        return;
    }
    const ctx = $canvas[0].getContext('2d');
    const pixelRatio = window.devicePixelRatio || 1; // Get device pixel ratio for high-DPI displays
    let resizeDebounceFrameId; 
    let growthAnimationFrameId; 

    const animationDuration = 1000; // Animation duration in milliseconds (1 second)
    const maxTreeDepth = 10;        // Maximum depth for tree generation

    let treeParams = {}; 
    let startTime;
    let isTreeGenerated = false; // Flag to check if tree structure is ready

    /**
     * Sets the canvas dimensions for high-DPI displays
     * @returns {void}
     */
    function setCanvasDimensions() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        // Set the actual canvas size in memory (scaled by pixel ratio for crisp rendering)
        $canvas[0].width = displayWidth * pixelRatio;
        $canvas[0].height = displayHeight * pixelRatio;
        
        // Scale the canvas back down using CSS to the display size
        $canvas.css({
            width: displayWidth + 'px',
            height: displayHeight + 'px'
        });
        
        // Scale the drawing context so everything draws at the higher resolution
        ctx.scale(pixelRatio, pixelRatio);
    }

    /**
     * Gets the tree color based on the current theme
     * @returns {string} RGBA color string for the tree
     */
    function getTreeColor() {
        const currentTheme = $(document.documentElement).attr('data-bs-theme') || 'light';
        return currentTheme === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'; // Solid white for dark theme, solid black for light theme
    }

    /**
     * Recursively draws a branch, then two child branches at its end,
     * plus two tiny "buds" part-way along the current branch.
     * @param {number} x1 - Starting X coordinate
     * @param {number} y1 - Starting Y coordinate
     * @param {number} length - Length of the current branch
     * @param {number} angle - Angle of the current branch in radians
     * @param {number} depth - Current depth in the tree structure
     * @param {string} treeColor - Color of the tree branches
     * @param {number} maxDepthForThisFrame - Maximum depth to draw in this frame
     * @returns {void}
     */
    function drawTreeRecursive(x1, y1, length, angle, depth, treeColor, maxDepthForThisFrame) {
        if (depth >= maxDepthForThisFrame || length < 2 || depth >= maxTreeDepth) {
            return;
        }

        // end-point of the current branch
        const x2 = x1 + length * Math.cos(angle);
        const y2 = y1 + length * Math.sin(angle);

        // draw the branch
        ctx.beginPath();
        ctx.strokeStyle = treeColor;
        ctx.lineWidth = Math.max(0.5, length * 0.02); // Dynamic line width based on branch length
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // primary bifurcation (classic binary tree)
        const nextLen = length * treeParams.branchRatio;
        drawTreeRecursive(x2, y2, nextLen, angle + treeParams.mainAngle, depth + 1, treeColor, maxDepthForThisFrame);
        drawTreeRecursive(x2, y2, nextLen, angle - treeParams.mainAngle, depth + 1, treeColor, maxDepthForThisFrame);

        /* --------------  secondary "bud" -------------- */
        if (depth > 1) { // skip the very bottom of the trunk for a cleaner base
            const xb = x1 + length * treeParams.extraSplit * Math.cos(angle);
            const yb = y1 + length * treeParams.extraSplit * Math.sin(angle);
            const budLen = nextLen * 0.6; // make the buds a bit shorter
            drawTreeRecursive(xb, yb, budLen, angle + treeParams.mainAngle, depth + 2, treeColor, maxDepthForThisFrame);
            drawTreeRecursive(xb, yb, budLen, angle - treeParams.mainAngle, depth + 2, treeColor, maxDepthForThisFrame);
        }
    }

    /**
     * Redraws the complete static tree with current parameters
     * @returns {void}
     */
    function redrawFullStaticTree() {
        if (!isTreeGenerated) return; 

        // Recalculate tree parameters for current screen size
        updateTreeParametersForCurrentScreen();
        
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); // Use display dimensions for clearing
        drawTreeRecursive(
            treeParams.startX,
            treeParams.startY,
            treeParams.initialLength,
            treeParams.initialAngle,
            0, 
            treeParams.treeColor, // Use stored tree color
            maxTreeDepth // Draw all levels
        );
    }

    /**
     * Updates tree parameters based on current screen dimensions
     * @returns {void}
     */
    function updateTreeParametersForCurrentScreen() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;

        // Recalculate position and size based on current screen dimensions
        treeParams.startX = 50; // Keep tree at left edge
        treeParams.startY = displayHeight;
        
        // Keep the same relative proportions but scale to new screen size
        const lengthScale = displayHeight * 0.25; // 25% of screen height
        
        // Preserve the random variations from the original generation
        if (treeParams.originalLengthRatio) {
            treeParams.initialLength = lengthScale * treeParams.originalLengthRatio;
        } else {
            // Fallback if ratio wasn't stored
            treeParams.initialLength = lengthScale;
        }
    }

    /**
     * Animates the growth of the tree over time
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     * @returns {void}
     */
    function animateGrowth(timestamp) {
        if (!startTime) {
            startTime = timestamp;
        }
        const elapsedTime = timestamp - startTime;
        const progress = Math.min(elapsedTime / animationDuration, 1);
        const currentMaxDepthForThisFrame = Math.ceil(progress * maxTreeDepth);

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        drawTreeRecursive(
            treeParams.startX,
            treeParams.startY,
            treeParams.initialLength,
            treeParams.initialAngle,
            0,
            treeParams.treeColor,
            currentMaxDepthForThisFrame
        );

        if (progress < 1) {
            growthAnimationFrameId = requestAnimationFrame(animateGrowth);
        }
    }

    /**
     * Generates a new random tree with unique parameters
     * @returns {void}
     */
    function generateRandomTree() {
        if (growthAnimationFrameId) {
            cancelAnimationFrame(growthAnimationFrameId);
        }
        startTime = null;
        isTreeGenerated = false; 

        setCanvasDimensions();

        // Use display dimensions for calculations, not canvas dimensions
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;

        const startX = 50; // Position tree at left edge of browser
        const startY = displayHeight;       
        const initialAngle = -Math.PI / 2; // Point upward (-90 degrees in radians)

        // Calculate tree size with random variations
        const baseLength = displayHeight * 0.25; // 25% of screen height for trunk
        const lengthVariation = Math.random() * (displayHeight * 0.05); // Small random variation
        const initialLength = baseLength + lengthVariation;

        treeParams = {
            startX, 
            startY, 
            initialLength, 
            initialAngle,
            treeColor: getTreeColor(),
            // New tree pattern parameters with slight randomization
            branchRatio: 0.78 + (Math.random() - 0.5) * 0.05, // 0.75 to 0.81
            mainAngle: (Math.PI / 6) + (Math.random() - 0.5) * 0.2, // ~25° to ~35° spread
            extraSplit: 0.60 + (Math.random() - 0.5) * 0.2, // 0.5 to 0.7 position along branch
            originalLengthRatio: (baseLength + lengthVariation) / baseLength
        };

        isTreeGenerated = true; 
        growthAnimationFrameId = requestAnimationFrame(animateGrowth);
    }

    // Initial tree generation
    generateRandomTree();

    // Handle window resize with debouncing
    $(window).on('resize', function() {
        // Cancel any pending resize operations
        if (resizeDebounceFrameId) {
            cancelAnimationFrame(resizeDebounceFrameId);
        }
        
        // Debounce the resize operation to avoid too many redraws
        resizeDebounceFrameId = requestAnimationFrame(function() {
            setCanvasDimensions();  // Adjust canvas dimensions
            // Redraw the existing tree with updated dimensions for current screen size
            if (isTreeGenerated) {
                redrawFullStaticTree();
            } else {
                generateRandomTree(); // If tree wasn't generated yet, generate it
            }
        });
    });

    // Handle orientation changes for mobile devices
    $(window).on('orientationchange', function() {
        // Small delay to let the orientation change complete
        setTimeout(function() {
            if (resizeDebounceFrameId) {
                cancelAnimationFrame(resizeDebounceFrameId);
            }
            
            resizeDebounceFrameId = requestAnimationFrame(function() {
                setCanvasDimensions();
                if (isTreeGenerated) {
                    redrawFullStaticTree();
                } else {
                    generateRandomTree();
                }
            });
        }, 100);
    });

    // Redraw on theme change - this should only recolor, not regenerate
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                if (!isTreeGenerated) break; // Don't recolor if tree isn't generated yet
                
                if (growthAnimationFrameId) cancelAnimationFrame(growthAnimationFrameId);
                if (resizeDebounceFrameId) cancelAnimationFrame(resizeDebounceFrameId); 
                
                // Only recolor the tree, don't regenerate structure
                treeParams.treeColor = getTreeColor(); // Update color based on new theme
                redrawFullStaticTree(); // Redraw with new color
                break;
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });

    const $themeToggler = $('#themeToggler');
    if ($themeToggler.length) {
        $themeToggler.on('click', () => {
            // The MutationObserver handles theme changes
        });
    }
}


/**
 * Document ready handler - initializes all page functionality
 */
$(document).ready(() => {
    // Load navbar and footer components
    loadHTML('navbar.html', 'navbar-placeholder', () => {
        initializeNavbarFeatures();
    });

    loadHTML('footer.html', 'footer-placeholder', null);

    // Draw fractal tree if on the About Me page
    if ($('#fractal-tree-canvas').length) {
        drawFractalTreeOnAboutPage();
    }

    // Display last activity if on the About Me page
    if ($('#activity-content').length) {
        displayLastActivity();
    }
});

/**
 * Project carousel initialization and management
 */
$(document).ready(function () {
    const $projectCarouselElement = $('#projectCarousel');

    if ($projectCarouselElement.length) {
        const $carouselItems = $projectCarouselElement.find('.carousel-item');
        const totalItems = $carouselItems.length;
        let bootstrapCarouselInstance;

        // Try to get or create the Bootstrap Carousel instance
        try {
            bootstrapCarouselInstance = bootstrap.Carousel.getOrCreateInstance($projectCarouselElement[0], {
                interval: false, // Disable auto-sliding for this effect
                wrap: true       // Enable wrapping
            });
        } catch (e) {
            console.error("Failed to initialize Bootstrap Carousel:", e);
            return; // Stop if Bootstrap Carousel can't be initialized
        }

        /**
         * Updates carousel item classes for custom styling
         * @returns {void}
         */
        function updateCarouselItemClasses() {
            if (totalItems === 0) {
                console.warn("Project Carousel: No items found.");
                return;
            }

            const $activeItemElement = $projectCarouselElement.find('.carousel-item.active');

            if (!$activeItemElement.length) {
                console.warn("Project Carousel: No '.carousel-item.active' found. Cannot apply custom styling. Items may remain hidden.");
                $carouselItems.each(function() {
                    $(this).removeClass(function(index, className) {
                        return (className.match(/(^|\s)c-item-\S+/g) || []).join(' ');
                    });
                });
                return;
            }
            
            const activeIndex = $carouselItems.index($activeItemElement);

            $carouselItems.each(function(i) {
                const $item = $(this);
                // Remove custom classes while preserving Bootstrap classes
                $item.removeClass(function(index, className) {
                    return (className.match(/(^|\s)c-item-\S+/g) || []).join(' ');
                });

                let diff = i - activeIndex;

                if (totalItems > 1) { 
                    if (Math.abs(diff) > totalItems / 2) {
                        if (diff > 0) {
                            diff -= totalItems;
                        } else {
                            diff += totalItems;
                        }
                    }
                }
                
                if (diff === 0) {
                    $item.addClass('c-item-active');
                } else if (diff === 1) {
                    $item.addClass('c-item-next-1');
                } else if (diff === -1) {
                    $item.addClass('c-item-prev-1');
                } else if (diff === 2) {
                    $item.addClass('c-item-next-2');
                } else if (diff === -2) {
                    $item.addClass('c-item-prev-2');
                } else {
                    $item.addClass('c-item-far');
                }
            });
            
            // Adjust carousel height after class updates
            adjustCarouselHeight();
        }

        /**
         * Adjusts carousel height based on visible items
         * @returns {void}
         */
        function adjustCarouselHeight() {
            const $visibleItems = $projectCarouselElement.find('.carousel-item.c-item-active, .carousel-item.c-item-next-1, .carousel-item.c-item-prev-1, .carousel-item.c-item-next-2, .carousel-item.c-item-prev-2');
            
            if ($visibleItems.length > 0) {
                let maxHeight = 0;
                
                $visibleItems.each(function() {
                    const cardHeight = $(this).find('.card').outerHeight(true);
                    maxHeight = Math.max(maxHeight, cardHeight);
                });
                
                const newHeight = Math.max(maxHeight + 40, 450); // 40px padding, minimum 450px
                $projectCarouselElement.find('.carousel-inner').css('min-height', newHeight + 'px');
            }
        }

        $projectCarouselElement.on('slid.bs.carousel', function () {
            requestAnimationFrame(updateCarouselItemClasses);
        });

        // Adjust height on window resize
        $(window).on('resize.carousel-height', function() {
            if ($projectCarouselElement.find('.carousel-item.active').length) {
                setTimeout(adjustCarouselHeight, 100);
            }
        });
        
        setTimeout(() => {
            console.log("Project Carousel: Attempting initial class update.");
            if ($projectCarouselElement.find('.carousel-item.active').length) {
                 updateCarouselItemClasses();
            } else {
                console.warn("Project Carousel: Initial check failed to find '.carousel-item.active'. Items might be hidden.");
                // If no item is active, and there are items, make the first one active as a fallback.
                if($carouselItems.length > 0 && !$projectCarouselElement.find('.carousel-item.active').length){
                    console.log("Project Carousel: Forcing first item to active and re-running update.");
                    $carouselItems.first().addClass('active');
                    updateCarouselItemClasses(); 
                }
            }
        }, 250);

    } else {
        console.warn("Project Carousel: Element with ID 'projectCarousel' not found.");
    }
});

/**
 * Contact form error handling
 */
$(document).ready(function() {
    const $contactForm = $('#contactForm');
    const $errorMessage = $('#form-error-message');

    if ($contactForm.length && $errorMessage.length) {
        $contactForm.on('submit', function(event) {
            event.preventDefault(); // Prevent the default form submission
            $errorMessage.removeClass('d-none');
        });
    }
});

/**
 * Tasks Table functionality and management
 */
const $taskForm = $('#task-form');
const $tasksTableBody = $('#tasks-table-body');
const $noTasksMessage = $('#no-tasks-message');

// Variable to track edit mode
let currentEditIndex = -1; // -1 means not editing any task
// Variable to store all tasks for filtering
let allTasks = [];
// Current active filters
let activeFilters = {
    type: 'none',
    value: null
};

if ($taskForm.length && $tasksTableBody.length) {
    // Load existing tasks when page loads
    loadTasks();
    
    // Initialize character counters
    const $taskNameInput = $('#task-name');
    const $taskDescriptionInput = $('#task-description');
    const $taskNameCounter = $('#task-name-counter');
    const $taskDescriptionCounter = $('#task-description-counter');
    
    // Set up event listeners for character counting
    if ($taskNameInput.length && $taskNameCounter.length) {
        updateCharCounter($taskNameInput[0], $taskNameCounter[0], 20);
        $taskNameInput.on('input', () => {
            updateCharCounter($taskNameInput[0], $taskNameCounter[0], 20);
        });
    }
    
    if ($taskDescriptionInput.length && $taskDescriptionCounter.length) {
        updateCharCounter($taskDescriptionInput[0], $taskDescriptionCounter[0], 100);
        $taskDescriptionInput.on('input', () => {
            updateCharCounter($taskDescriptionInput[0], $taskDescriptionCounter[0], 100);
        });
    }
    
    // Handle form submission
    $taskForm.on('submit', function(event) {
        event.preventDefault();
        
        // Get form values
        const $nameInput = $('#task-name');
        const $descriptionInput = $('#task-description');
        const $dueDateInput = $('#task-due-date');
        const $statusSelect = $('#task-status');
        const $importanceSelect = $('#task-importance');
        
        if (!$nameInput.length || !$descriptionInput.length || !$dueDateInput.length || !$statusSelect.length || !$importanceSelect.length) {
            alert('Error: Form fields not found');
            return;
        }
        
        // Create task object
        const taskName = $nameInput.val().trim();
        const taskDescription = $descriptionInput.val().trim();
        
        // Validate character limits
        if (taskName.length > 20) {
            alert('Task name cannot exceed 20 characters');
            return;
        }
        
        if (taskDescription.length > 100) {
            alert('Task description cannot exceed 100 characters');
            return;
        }
        
        if (taskName.length === 0) {
            alert('Task name cannot be empty');
            return;
        }
        
        if (taskDescription.length === 0) {
            alert('Task description cannot be empty');
            return;
        }
        
        const newTask = {
            name: taskName,
            description: taskDescription,
            dueDate: $dueDateInput.val(),
            status: $statusSelect.val(),
            importance: $importanceSelect.val()
        };
        
        // Check if we're updating an existing task
        if (currentEditIndex >= 0) {
            updateTask(currentEditIndex, newTask);
            currentEditIndex = -1; // Reset edit mode
            
            // Reset submit button text
            const $submitButton = $('#task-form button[type="submit"]');
            if ($submitButton.length) {
                $submitButton.text('Add Task');
            }
        } else {
            // Add new task as before
            saveTask(newTask);
        }
        
        // Reset form
        $taskForm[0].reset();
        
        // Update character counters if they exist
        if ($taskNameCounter.length) {
            updateCharCounter($nameInput[0], $taskNameCounter[0], 20);
        }
        
        if ($taskDescriptionCounter.length) {
            updateCharCounter($descriptionInput[0], $taskDescriptionCounter[0], 100);
        }
        
        // Refresh tasks display with current filters applied
        applyFilters();
    });
}

/**
 * Event listeners for task filtering functionality
 */
const $filterTypeSelect = $('#filter-type');
if ($filterTypeSelect.length) {
    $filterTypeSelect.on('change', function() {
        // Hide all filter value containers first
        $('.filter-value-container').addClass('d-none');
        
        const selectedFilter = $(this).val();
        activeFilters.type = selectedFilter;
        
        // Show the appropriate filter inputs based on selection
        if (selectedFilter === 'name') {
            $('#name-filter-container').removeClass('d-none');
        } else if (selectedFilter === 'date') {
            $('#date-filter-container').removeClass('d-none');
        } else if (selectedFilter === 'status') {
            $('#status-filter-container').removeClass('d-none');
        } else if (selectedFilter === 'importance') {
            $('#importance-filter-container').removeClass('d-none');
        }
        
        // Apply the filter
        applyFilters();
    });
}

// Add event listeners for filter value changes
const $nameFilter = $('#name-filter');
const $dateFilterFrom = $('#date-filter-from');
const $dateFilterTo = $('#date-filter-to');
const $statusFilter = $('#status-filter');
const $importanceFilter = $('#importance-filter');
const $clearFilterBtn = $('#clear-filter');

if ($nameFilter.length) {
    $nameFilter.on('input', function() {
        activeFilters.value = $(this).val();
        applyFilters();
    });
}

if ($dateFilterFrom.length && $dateFilterTo.length) {
    $dateFilterFrom.on('change', function() {
        activeFilters.value = {
            from: $(this).val(),
            to: $dateFilterTo.val()
        };
        applyFilters();
    });
    
    $dateFilterTo.on('change', function() {
        activeFilters.value = {
            from: $dateFilterFrom.val(),
            to: $(this).val()
        };
        applyFilters();
    });
}

if ($statusFilter.length) {
    $statusFilter.on('change', function() {
        activeFilters.value = $(this).val();
        applyFilters();
    });
}

if ($importanceFilter.length) {
    $importanceFilter.on('change', function() {
        activeFilters.value = $(this).val();
        applyFilters();
    });
}

if ($clearFilterBtn.length) {
    $clearFilterBtn.on('click', function() {
        // Reset filter selections
        if ($filterTypeSelect.length) $filterTypeSelect.val('none');
        if ($nameFilter.length) $nameFilter.val('');
        if ($dateFilterFrom.length) $dateFilterFrom.val('');
        if ($dateFilterTo.length) $dateFilterTo.val('');
        if ($statusFilter.length) $statusFilter.val('all');
        if ($importanceFilter.length) $importanceFilter.val('all');
        
        // Hide all filter value containers
        $('.filter-value-container').addClass('d-none');
        
        // Reset active filters
        activeFilters = {
            type: 'none',
            value: null
        };
        
        // Show all tasks
        displayTasks(allTasks);
    });
}

/**
 * Event delegation for task actions (edit, delete, complete)
 */
if ($tasksTableBody.length) {
    $tasksTableBody.on('click', 'button', function(event) {
        const $target = $(this);
        const $taskRow = $target.closest('tr');
        const taskIndex = $taskRow.data('index');
        
        // Handle edit button
        if ($target.hasClass('edit-task')) {
            currentEditIndex = parseInt(taskIndex);
            editTask(currentEditIndex);
        }
        
        // Handle delete button
        if ($target.hasClass('delete-task')) {
            deleteTask(taskIndex);
            loadTasks();
        }
        
        // Handle complete button
        if ($target.hasClass('complete-task') && !$target.hasClass('disabled')) {
            completeTask(taskIndex);
            loadTasks();
        }
    });
}

/**
 * Set min and max date constraints for date inputs
 */
const $dueDateInput = $('#task-due-date');

if ($dueDateInput.length) {
    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(today.getFullYear() + 1);
    
    $dueDateInput.attr('min', formatDateForInput(today));
    $dueDateInput.attr('max', formatDateForInput(oneYearLater));
    
    // Also set date range for filters
    if ($dateFilterFrom.length) {
        const oneYearEarlier = new Date();
        oneYearEarlier.setFullYear(today.getFullYear() - 1);
        $dateFilterFrom.attr('min', formatDateForInput(oneYearEarlier));
        $dateFilterFrom.attr('max', formatDateForInput(oneYearLater));
    }
    
    if ($dateFilterTo.length) {
        const oneYearEarlier = new Date();
        oneYearEarlier.setFullYear(today.getFullYear() - 1);
        $dateFilterTo.attr('min', formatDateForInput(oneYearEarlier));
        $dateFilterTo.attr('max', formatDateForInput(oneYearLater));
    }
}

// Helper function to format date as YYYY-MM-DD for input elements
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display (e.g., "15 Jun 2025")
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric', 
        month: 'short', 
        year: 'numeric'
    });
}

/**
 * Loads tasks from localStorage and displays them
 * @returns {void}
 */
function loadTasks() {
    const $tasksTableBody = $('#tasks-table-body');
    const $noTasksMessage = $('#no-tasks-message');
    
    if (!$tasksTableBody.length || !$noTasksMessage.length) return;
    
    // Clear existing rows
    $tasksTableBody.empty();
    
    // Get tasks from localStorage
    allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    // Display tasks (filtered or all)
    displayTasks(allTasks);
    
    // Initialize tooltips
    initializeTooltips();
}

/**
 * Displays tasks in the table (handles both filtered and unfiltered views)
 * @param {Array} tasksToDisplay - Array of task objects to display
 * @returns {void}
 */
function displayTasks(tasksToDisplay) {
    const $tasksTableBody = $('#tasks-table-body');
    const $noTasksMessage = $('#no-tasks-message');
    
    if (!$tasksTableBody.length || !$noTasksMessage.length) return;
    
    // Clear existing rows
    $tasksTableBody.empty();
    
    // Show/hide no tasks message
    if (tasksToDisplay.length === 0) {
        $noTasksMessage.removeClass('d-none');
    } else {
        $noTasksMessage.addClass('d-none');
    }
    
    // Add each task to the table
    tasksToDisplay.forEach((task, index) => {
        const originalIndex = allTasks.indexOf(task); // Find the original index in the full tasks array
        
        const $row = $('<tr>').attr('data-index', originalIndex); // Use the original index for editing/deleting
        
        // Create task name cell
        const $nameCell = $('<td>').addClass('text-center').text(task.name);
        $row.append($nameCell);
        
        // Create description cell with tooltip for long descriptions
        const $descriptionCell = $('<td>').addClass('text-center');
        const shortDesc = truncateText(task.description, 30); // Truncate to 30 chars
        $descriptionCell.text(shortDesc);
        
        if (task.description.length > 30) {
            // Add tooltip for full description 
            $descriptionCell.attr({
                'data-bs-toggle': 'tooltip',
                'data-bs-original-title': task.description
            });
        }
        $row.append($descriptionCell);
        
        // Create due date cell
        const $dueDateCell = $('<td>').addClass('text-center').text(formatDateForDisplay(task.dueDate));
        $row.append($dueDateCell);
        
        // Create status cell with badge
        const $statusCell = $('<td>').addClass('text-center');
        const $statusBadge = $('<span>')
            .addClass(`badge ${getStatusBadgeClass(task.status)}`)
            .text(capitalizeFirstLetter(task.status));
        $statusCell.append($statusBadge);
        $row.append($statusCell);
        
        // Create importance cell with badge
        const $importanceCell = $('<td>').addClass('text-center');
        const $importanceBadge = $('<span>')
            .addClass(`badge ${getImportanceBadgeClass(task.importance)}`)
            .text(capitalizeFirstLetter(task.importance));
        $importanceCell.append($importanceBadge);
        $row.append($importanceCell);
        
        // Create actions cell with buttons
        const $actionsCell = $('<td>').addClass('text-center');
        const $actionButtons = $('<div>').addClass('d-flex justify-content-center flex-wrap');
        
        // Edit button
        const $editButton = $('<button>')
            .addClass('btn btn-sm btn-outline-primary edit-task')
            .attr('title', 'Edit Task')
            .html('<i class="bi bi-pencil"></i>');
        
        // Delete button
        const $deleteButton = $('<button>')
            .addClass('btn btn-sm btn-outline-primary delete-task')
            .attr('title', 'Delete Task')
            .html('<i class="bi bi-trash"></i>');
        
        // Complete button (disabled if already completed)
        const $completeButton = $('<button>')
            .addClass('btn btn-sm btn-outline-primary complete-task')
            .attr('title', 'Mark Complete')
            .html('<i class="bi bi-check-lg"></i>');
        
        if (task.status === 'completed') {
            $completeButton.addClass('disabled');
        }
        
        $actionButtons.append($editButton, $deleteButton, $completeButton);
        $actionsCell.append($actionButtons);
        $row.append($actionsCell);
        
        $tasksTableBody.append($row);
    });
}

// Filter tasks based on active filters
function applyFilters() {
    if (activeFilters.type === 'none' || activeFilters.value === null) {
        // No filter or empty filter value, show all tasks
        displayTasks(allTasks);
        return;
    }
    
    let filteredTasks = [];
    
    switch(activeFilters.type) {
        case 'name':
            const searchTerm = activeFilters.value.toLowerCase();
            filteredTasks = allTasks.filter(task => 
                task.name.toLowerCase().includes(searchTerm)
            );
            break;
            
        case 'date':
            if (!activeFilters.value.from && !activeFilters.value.to) {
                filteredTasks = allTasks; // No dates selected, show all
            } else {
                filteredTasks = allTasks.filter(task => {
                    const taskDate = new Date(task.dueDate);
                    let isInRange = true;
                    
                    if (activeFilters.value.from) {
                        const fromDate = new Date(activeFilters.value.from);
                        isInRange = isInRange && taskDate >= fromDate;
                    }
                    
                    if (activeFilters.value.to) {
                        const toDate = new Date(activeFilters.value.to);
                        isInRange = isInRange && taskDate <= toDate;
                    }
                    
                    return isInRange;
                });
            }
            break;
            
        case 'status':
            filteredTasks = activeFilters.value === 'all' 
                ? allTasks 
                : allTasks.filter(task => task.status === activeFilters.value);
            break;
            
        case 'importance':
            filteredTasks = activeFilters.value === 'all' 
                ? allTasks 
                : allTasks.filter(task => task.importance === activeFilters.value);
            break;
    }
    
    displayTasks(filteredTasks);
}

// Save a new task to localStorage
function saveTask(task) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    allTasks = tasks; // Update our local copy
}

// Delete a task
function deleteTask(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    if (index >= 0 && index < tasks.length) {
        tasks.splice(index, 1);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        allTasks = tasks; // Update our local copy
        applyFilters(); // Re-apply current filters after deletion
    }
}

/**
 * Edits a task by populating the form with task data
 * @param {number} index - Index of the task to edit
 * @returns {void}
 */
function editTask(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    if (index >= 0 && index < tasks.length) {
        // Set the form fields with the task data
        const task = tasks[index];
        $('#task-name').val(task.name);
        $('#task-description').val(task.description);
        $('#task-due-date').val(task.dueDate);
        $('#task-status').val(task.status);
        $('#task-importance').val(task.importance);
        
        // Track which task is being edited
        currentEditIndex = index;
        
        // Update character counters
        const $taskNameCounter = $('#task-name-counter');
        const $taskDescriptionCounter = $('#task-description-counter');
        
        if ($taskNameCounter.length) {
            updateCharCounter($('#task-name')[0], $taskNameCounter[0], 20);
        }
        
        if ($taskDescriptionCounter.length) {
            updateCharCounter($('#task-description')[0], $taskDescriptionCounter[0], 100);
        }
        
        // Change submit button text
        const $submitButton = $('#task-form button[type="submit"]');
        if ($submitButton.length) {
            $submitButton.text('Update Task');
        }
        
        // Scroll to form
        $('#task-form')[0].scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Marks a task as complete
 * @param {number} index - Index of the task to complete
 * @returns {void}
 */
function completeTask(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    if (index >= 0 && index < tasks.length) {
        tasks[index].status = 'completed';
        localStorage.setItem('tasks', JSON.stringify(tasks));
        allTasks = tasks; // Update our local copy
        applyFilters(); // Re-apply current filters
    }
}

// Update an existing task
function updateTask(index, updatedTask) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    if (index >= 0 && index < tasks.length) {
        tasks[index] = updatedTask;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        allTasks = tasks; // Update our local copy
        applyFilters(); // Re-apply current filters
    }
}

// Get appropriate badge class for status
function getStatusBadgeClass(status) {
    switch(status) {
        case 'planned':
            return 'bg-warning text-dark';
        case 'started':
            return 'bg-info text-dark';
        case 'completed':
            return 'bg-dark';
        default:
            return 'bg-secondary';
    }
}

// Get appropriate badge class for importance
function getImportanceBadgeClass(importance) {
    switch(importance) {
        case 'low':
            return 'bg-success';
        case 'medium':
            return 'bg-info text-dark';
        case 'high':
            return 'bg-dark';
        default:
            return 'bg-secondary';
    }
}

// Capitalize first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Truncate text with ellipsis if too long
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Displays the latest task activity on the aboutMe page
 * @returns {void}
 */
function displayLastActivity() {
    const $activityContent = $('#activity-content');
    if (!$activityContent.length) return;

    // Get tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    if (tasks.length === 0) {
        $activityContent.html(`
            <p class="text-center text-muted">
                No information about latest activity. Add information in the 
                <a href="tasksTable.html" class="text-decoration-none">table</a>
            </p>
        `);
        return;
    }

    // Count tasks by status  
    const plannedTasks = tasks.filter(task => task.status === 'started').length;
    const activeTasks = tasks.filter(task => task.status === 'planned').length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    
    $activityContent.html(`
        <div class="text-center">
            <div class="row mb-4">
                <div class="col-4">
                    <h4 class="mb-0">${plannedTasks}</h4>
                    <small class="text-muted">Planned</small>
                </div>
                <div class="col-4">
                    <h4 class="mb-0">${activeTasks}</h4>
                    <small class="text-muted">Active</small>
                </div>
                <div class="col-4">
                    <h4 class="mb-0">${completedTasks}</h4>
                    <small class="text-muted">Completed</small>
                </div>
            </div>
            
            <p class="text-muted">
                Information taken from the <a href="tasksTable.html" class="text-decoration-none">table</a>
            </p>
        </div>
    `);
}

/**
 * Format date as YYYY-MM-DD for input elements
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for display (e.g., "15 Jun 2025")
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date string for display
 */
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric', 
        month: 'short', 
        year: 'numeric'
    });
}

/**
 * Apply filters to the task list
 * @returns {void}
 */
function applyFilters() {
    if (activeFilters.type === 'none' || activeFilters.value === null) {
        // No filter or empty filter value, show all tasks
        displayTasks(allTasks);
        return;
    }
    
    let filteredTasks = [];
    
    switch(activeFilters.type) {
        case 'name':
            filteredTasks = allTasks.filter(task => 
                task.name.toLowerCase().includes(activeFilters.value.toLowerCase())
            );
            break;
            
        case 'date':
            filteredTasks = allTasks.filter(task => {
                const taskDate = new Date(task.dueDate);
                const fromDate = activeFilters.value.from ? new Date(activeFilters.value.from) : null;
                const toDate = activeFilters.value.to ? new Date(activeFilters.value.to) : null;
                
                if (fromDate && toDate) {
                    return taskDate >= fromDate && taskDate <= toDate;
                } else if (fromDate) {
                    return taskDate >= fromDate;
                } else if (toDate) {
                    return taskDate <= toDate;
                }
                return true;
            });
            break;
            
        case 'status':
            filteredTasks = allTasks.filter(task => task.status === activeFilters.value);
            break;
            
        case 'importance':
            filteredTasks = allTasks.filter(task => task.importance === activeFilters.value);
            break;
    }
    
    displayTasks(filteredTasks);
}

/**
 * Save a new task to localStorage
 * @param {Object} task - The task object to save
 * @returns {void}
 */
function saveTask(task) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    allTasks = tasks; // Update our local copy
}

/**
 * Delete a task from localStorage
 * @param {number} index - Index of the task to delete
 * @returns {void}
 */
function deleteTask(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    if (index >= 0 && index < tasks.length) {
        tasks.splice(index, 1);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        allTasks = tasks; // Update our local copy
    }
}

/**
 * Update an existing task in localStorage
 * @param {number} index - Index of the task to update
 * @param {Object} updatedTask - Updated task object
 * @returns {void}
 */
function updateTask(index, updatedTask) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    if (index >= 0 && index < tasks.length) {
        tasks[index] = updatedTask;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        allTasks = tasks; // Update our local copy
    }
}

/**
 * Get appropriate badge class for status
 * @param {string} status - The task status
 * @returns {string} CSS class for the status badge
 */
function getStatusBadgeClass(status) {
    switch(status) {
        case 'planned': return 'bg-info text-dark';
        case 'started': return 'bg-warning text-dark';
        case 'completed': return 'bg-success';
        default: return 'bg-secondary';
    }
}

/**
 * Get appropriate badge class for importance
 * @param {string} importance - The task importance level
 * @returns {string} CSS class for the importance badge
 */
function getImportanceBadgeClass(importance) {
    switch(importance) {
        case 'low': return 'bg-light text-dark';
        case 'medium': return 'bg-warning text-dark';
        case 'high': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

/**
 * Capitalize first letter of a string
 * @param {string} string - The string to capitalize
 * @returns {string} String with first letter capitalized
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Truncate text with ellipsis if too long
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Initialize Bootstrap tooltips
 * @returns {void}
 */
function initializeTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

/**
 * Update character counters for inputs with limits
 * @param {HTMLElement} inputElement - The input element
 * @param {HTMLElement} counterElement - The counter display element
 * @param {number} maxLength - Maximum allowed length
 * @returns {void}
 */
function updateCharCounter(inputElement, counterElement, maxLength) {
    const charCount = inputElement.value.length;
    counterElement.textContent = `${charCount}/${maxLength}`;
    
    // Add visual feedback when approaching the limit
    if (charCount > maxLength) {
        counterElement.style.color = 'red';
    } else if (charCount > maxLength * 0.8) {
        counterElement.style.color = 'orange';
    } else {
        counterElement.style.color = '';
    }
}

//# sourceMappingURL=main.js.map