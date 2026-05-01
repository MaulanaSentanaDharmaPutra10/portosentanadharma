document.addEventListener('DOMContentLoaded', () => {
    
    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-item');
    const icon = menuBtn.querySelector('i');

    menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    // Close mobile menu on link click
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navLinks.classList.remove('active');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });

    // Active Navigation Link Update on Scroll
    const sections = document.querySelectorAll('section, header');
    
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            // Add offset to trigger slightly before element is at very top
            if (scrollY >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').includes(current)) {
                item.classList.add('active');
            }
        });
    });

    // Scroll Reveal Animations using Intersection Observer
    const revealElements = document.querySelectorAll('.reveal');

    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(
        entries,
        observer
    ) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed to only animate once
                // observer.unobserve(entry.target);
            }
        });
    },
    revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // Back to Top Button
    const backToTopBtn = document.getElementById('backToTop');
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Arcade Carousel Logic
    const arcadeSlider = document.getElementById('arcadeSlider');
    const prevBtn = document.getElementById('gamePrev');
    const nextBtn = document.getElementById('gameNext');
    const dots = document.querySelectorAll('.dot');
    
    if (arcadeSlider) {
        let currentIndex = 0;
        const gameCount = document.querySelectorAll('.arcade-slider .game-wrapper').length;

        const updateDots = (index) => {
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        };

        const scrollToGame = (index) => {
            const scrollAmount = arcadeSlider.clientWidth * index;
            arcadeSlider.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
            });
            updateDots(index);
        };

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % gameCount;
            scrollToGame(currentIndex);
        });

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + gameCount) % gameCount;
            scrollToGame(currentIndex);
        });

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                currentIndex = i;
                scrollToGame(currentIndex);
            });
        });

        // Update dots on scroll (for mobile touch)
        arcadeSlider.addEventListener('scroll', () => {
            const index = Math.round(arcadeSlider.scrollLeft / arcadeSlider.clientWidth);
            if (index !== currentIndex) {
                currentIndex = index;
                updateDots(currentIndex);
            }
        });
        
        // Expand/Minimize Game Logic
        const gameWrappers = document.querySelectorAll('.arcade-slider .game-wrapper');
        
        gameWrappers.forEach(wrapper => {
            const canvas = wrapper.querySelector('canvas');
            const closeBtn = wrapper.querySelector('.close-game');

            canvas.addEventListener('click', (e) => {
                if (!wrapper.classList.contains('expanded')) {
                    // Only expand if not already expanded
                    wrapper.classList.add('expanded');
                    document.body.style.overflow = 'hidden'; // Lock scroll
                }
            });

            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                wrapper.classList.remove('expanded');
                document.body.style.overflow = 'auto'; // Restore scroll
            });
        });
    }

});
