'use strict';

/**
 * 初始化鼠标光晕跟随效果
 * 为鼠标位置添加动态光晕效果，增强视觉交互体验
 */
function initCursorEffect() {
    const cursorLight = document.querySelector('.cursor-light');
    
    if (!cursorLight) {
        console.warn('未找到 .cursor-light 元素');
        return;
    }

    window.addEventListener('mousemove', (event) => {
        cursorLight.style.left = event.clientX + 'px';
        cursorLight.style.top = event.clientY + 'px';
    });
}

/**
 * 初始化滚动出现动画
 * 使用 IntersectionObserver 实现元素进入视口时的淡入动画
 */
function initRevealAnimation() {
    const revealElements = document.querySelectorAll('.reveal');
    
    if (revealElements.length === 0) {
        console.warn('未找到 .reveal 元素');
        return;
    }

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, observerOptions);

    revealElements.forEach((element) => {
        observer.observe(element);
    });
}

/**
 * 初始化导航栏滚动效果
 * 滚动时改变导航栏背景透明度
 */
function initNavbarScrollEffect() {
    const navbar = document.querySelector('.navbar');
    
    if (!navbar) {
        console.warn('未找到 .navbar 元素');
        return;
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.12)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.08)';
        }
    });
}

/**
 * 初始化表单提交处理
 * 阻止默认提交行为，添加用户反馈
 */
function initFormSubmit() {
    const contactForm = document.querySelector('.contact-form');
    
    if (!contactForm) {
        console.warn('未找到 .contact-form 元素');
        return;
    }

    contactForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        // 获取表单数据
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const message = formData.get('message');

        // 简单验证
        if (!name || !email || !message) {
            alert('请填写完整信息');
            return;
        }

        // 模拟提交成功
        alert('消息发送成功！我会尽快回复您。');
        contactForm.reset();
    });
}

/**
 * 页面加载完成后初始化所有功能
 */
document.addEventListener('DOMContentLoaded', () => {
    initCursorEffect();
    initRevealAnimation();
    initNavbarScrollEffect();
    initFormSubmit();
});
