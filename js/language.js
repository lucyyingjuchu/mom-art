// languages.js - All text content in one place
const LANGUAGE_DATA = {
    en: {
        // Header
        header: {
            title: "Yuan Zhi-Jing - Xiaoran Cultural Arts",
            subtitle: "Chinese Paintings & Calligraphy"
        },
        
        // Navigation
        nav: {
            featured: "Featured",
            gallery: "Gallery",
            about: "About", 
            connect: "Connect"
        },
        
        // Home page
        home: {
            heroTitle: "Welcome to My Art World",
            heroDescription: "Explore a collection of paintings and calligraphy that captures the beauty of traditional and contemporary art forms. Each piece tells a story through delicate brushstrokes and thoughtful composition.",
            featuredTitle: "Featured Artworks",
            featuredSubtitle: "A curated selection of exceptional pieces",
            viewAllButton: "View Complete Gallery"
        },
        
        // Gallery filters
        filters: {
            bySubject: "By Subject",
            byLocation: "By Location",
            byYear: "By Year",
            clearAll: "Clear All Filters",
            searchPlaceholder: "Search artworks...",
            showingResults: "Showing {count} of {total} artworks",
            showingFiltered: "Showing {count} of {total} artworks ({filters} filters active)",
            showingAll: "Showing all {total} artworks"
        },
        
        // Subject labels
        subjects: {
            waterfall: "Waterfalls",
            landscape: "Landscape", 
            flowers: "Flowers & Birds",
            bamboo: "Bamboo",
            calligraphy: "Calligraphy",
            flowingclouds: "Flowing Clouds",
            abstract: "Abstract"
        },
        
        // Location labels  
        locations: {
            huangshan: "Huangshan",
            alishan: "Alishan",
            taroko: "Taroko",
            hehuanshan: "Hehuanshan",
            yushan: "Yushan",
            liushishishan: "Liushishi Mt.",
            guishandao: "Guishan Island",
            longdong: "Longdong",
            zhangjiajie: "Zhangjiajie",
            grandcanyon: "Grand Canyon",
            iguazu: "Iguazu Falls",
            niagara: "Niagara Falls"
        },
        
        // Year periods
        years: {
            recent: "Recent 2020+",
            "2010s": "2010s", 
            earlier: "Earlier"
        },
        
        // About page
        about: {
            mainTitle: "Artist Yuan Zhi-Jing (Xiaoran) | Painter & Educator",
            videoTitle: "Documentary Film",
            educationTitle: "Education",
            awardsTitle: "Awards & Recognition",
            publicationsTitle: "Publications & Works",
            teachingTitle: "Teaching Experience", 
            positionsTitle: "Current Positions & Affiliations",
            exhibitionsTitle: "Solo Exhibitions",
            groupShowsTitle: "Group Exhibitions & Teaching Shows"
        },
        
        // Connect page
        connect: {
            title: "Connect With Me",
            subtitle: "Follow my artistic journey and stay updated with new works, exhibitions, and creative insights.",
            emailTitle: "Email",
            emailDesc: "For inquiries, commissions, or collaborations",
            facebookTitle: "Facebook", 
            facebookDesc: "Latest artworks and behind-the-scenes content",
            facebookButton: "Visit Fan Page",
            locationText: "Based in Taichung, Taiwan"
        },
        
        // Lightbox
        lightbox: {
            availableStatus: "Available for Purchase",
            soldStatus: "Sold",
            yearLabel: "Year",
            dimensionsLabel: "Dimensions", 
            mediumLabel: "Medium",
            formatLabel: "Format",
            shareTitle: "Share Artwork",
            closeTitle: "Close Lightbox",
            prevTitle: "Previous Artwork",
            nextTitle: "Next Artwork"
        },
        
        // Common
        common: {
            available: "Available",
            sold: "Sold",
            untitled: "Untitled",
            unknown: "Unknown",
            sizeNotSpecified: "Size not specified",
            noDescription: "No description available",
            loading: "Loading artworks..."
        }
    },
    
    zh: {
        // Header
        header: {
            title: "袁之靜 - 曉然文化藝術",
            subtitle: "國畫、書法作品"
        },
        
        // Navigation  
        nav: {
            featured: "精選",
            gallery: "藝廊",
            about: "關於",
            connect: "聯絡"
        },
        
        // Home page
        home: {
            heroTitle: "歡迎來到我的藝術世界",
            heroDescription: "探索國畫與書法作品集，感受傳統與當代藝術形式的美麗。每一幅作品都透過細膩的筆觸和深思的構圖訴說著故事。",
            featuredTitle: "精選作品",
            featuredSubtitle: "精心策劃的傑出作品",
            viewAllButton: "查看完整作品集"
        },
        
        // Gallery filters
        filters: {
            bySubject: "題材",
            byLocation: "地點", 
            byYear: "年代",
            clearAll: "清除所有篩選",
            searchPlaceholder: "搜尋作品...",
            showingResults: "顯示 {count} 件，共 {total} 件作品",
            showingFiltered: "顯示 {count} 件，共 {total} 件作品（{filters} 個篩選條件）",
            showingAll: "顯示全部 {total} 件作品"
        },
        
        // Subject labels
        subjects: {
            waterfall: "瀑布",
            landscape: "山水",
            flowers: "花鳥", 
            bamboo: "墨竹",
            calligraphy: "書法",
            flowingclouds: "煙雲",
            abstract: "抽象"
        },
        
        // Location labels
        locations: {
            huangshan: "黃山",
            alishan: "阿里山",
            taroko: "太魯閣",
            hehuanshan: "合歡山", 
            yushan: "玉山",
            liushishishan: "六十石山",
            guishandao: "龜山島",
            longdong: "龍洞",
            zhangjiajie: "張家界",
            grandcanyon: "大峽谷",
            iguazu: "伊瓜蘇",
            niagara: "尼加拉"
        },
        
        // Year periods
        years: {
            recent: "近期 2020+",
            "2010s": "2010年代",
            earlier: "更早期"
        },
        
        // About page
        about: {
            mainTitle: "藝術家袁之靜（號曉然）｜書畫創作與教育者",
            videoTitle: "創作紀錄片",
            educationTitle: "學歷",
            awardsTitle: "獲獎紀錄",
            publicationsTitle: "出版與著作",
            teachingTitle: "教學經歷",
            positionsTitle: "現任職務與學會身分", 
            exhibitionsTitle: "個展一覽",
            groupShowsTitle: "聯展與教學成果展"
        },
        
        // Connect page
        connect: {
            title: "與我聯繫",
            subtitle: "關注我的藝術旅程，獲取最新作品、展覽和創作見解。",
            emailTitle: "電子郵件",
            emailDesc: "諮詢、委託或合作事宜",
            facebookTitle: "臉書",
            facebookDesc: "最新作品與幕後花絮",
            facebookButton: "造訪粉絲頁",
            locationText: "工作室位於台灣台中"
        },
        
        // Lightbox
        lightbox: {
            availableStatus: "可供購買",
            soldStatus: "已售出",
            yearLabel: "年份",
            dimensionsLabel: "尺寸",
            mediumLabel: "媒材", 
            formatLabel: "裝裱",
            shareTitle: "分享作品",
            closeTitle: "關閉檢視",
            prevTitle: "上一件作品",
            nextTitle: "下一件作品"
        },
        
        // Common
        common: {
            available: "可售",
            sold: "已售",
            untitled: "無題",
            unknown: "未知",
            sizeNotSpecified: "尺寸未標明",
            noDescription: "無作品說明",
            loading: "載入作品中..."
        }
    }
};