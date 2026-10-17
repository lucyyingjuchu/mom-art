// languages.js - All text content in one place
// UPDATED: Removed category labels (now in category-config.json)
const LANGUAGE_DATA = {
    en: {
        // Header
        header: {
            title: "Xiaoran Cultural Arts",
            subtitle: "Where stillness meets the flowing brush: Chinese Paintings & Calligraphy"
        },
        
        // Navigation
        nav: {
            featured: "Featured",
            gallery: "Gallery",
            about: "About", 
            exhibitions: "Exhibitions & News",
            faq: "FAQ",
            connect: "Contact"
        },
        
        // Home page
        home: {
            featuredTitle: "Featured Artworks",
            viewAllButton: "View Complete Gallery",
            latestTitle: "Latest from the Studio",
            latestMore: "More updates on Facebook"
        },
        
        //Gallery
        gallery: {
            withImages: "with images",
        },

        // Gallery filters (only non-category related)
        filters: {
            clearAll: "Clear All Filters",
            searchPlaceholder: "Search artworks, descriptions...",
            showingAll: "Showing all {total} artworks",
            showingFiltered: "Showing {count} / {total} artworks ({filters} filters)",
            showingResults: "Found {count} / {total} artworks", 
            searchResults: "Found {count} results for \"{query}\"",
            searchWithFilters: "Found {count} results for \"{query}\" ({filters} filters applied)"
        },
        
        // Year periods (not categories)
        years: {
            recent: "Recent 2020+",
            "2010s": "2010s", 
            earlier: "Earlier"
        },
        
        // About page
        about: {
            mainTitle: "Yuan Chih-Jin (Xiaoran)",
            mainSubtitle: "Ink painter · Calligrapher · Teacher",
            quote: "“The landscapes I see slowly become the landscapes of my heart.”",
            story: [
                "Yuan Chih-Jin, who paints under the name Xiaoran, grew up in a scholarly household in Taichung, Taiwan. Her father, the calligrapher Yuan De-jiong, filled their home with poetry and brushwork — she learned to read a classical poem and shape a character long before she painted her first mountain. In 2013, father and daughter exhibited side by side.",
                "She built a career outside the studio but never put the brush down, and later returned to school for an M.F.A. in Painting and Calligraphy at National Taiwan University of Arts. Over four decades she has studied with more than a dozen masters, including Luo Zhen-xian and Ou Hao-nian, and carried her sketchbook from Jade Mountain to Iguazu Falls.",
                "Teaching has always run alongside her painting. She has taught at National Chung Hsing University — including Chinese painting for international students — Chaoyang University of Technology and Central Taiwan University of Science and Technology, and still leads classes at the Taichung Dadun Cultural Center, showing with her students year after year. A past President of the Taiwan Province Chinese Painting and Calligraphy Association, she now serves as its Honorary President.",
                "Her work has gradually moved from recognizable landscapes toward abstraction — blocks of color, light and line, moons on gold xuan paper, sailboats leaving the harbor. It has been shown across Taiwan and as far as Venice, yet every painting still begins the same way: with a walk, a sketch, and a quiet heart."
            ],
            videoTitle: "Videos",
            mediaTitle: "In the Press",
            articlesTitle: "News Coverage",
            captionNote: "In Mandarin with English subtitles",
            noCaptionNote: "In Mandarin · English subtitles coming soon",
            dubbedNote: "English dubbed",
            articlesNote: "News articles are in Chinese.",
            highlightsTitle: "Recent Highlights",
            seeAllExhibitions: "Exhibitions & news →",
            currentBadge: "Current",
            tabStory: "Story",
            tabVideos: "Documentaries",
            tabCareer: "Credentials",
            educationTitle: "Education",
            awardsTitle: "Awards & Recognition",
            publicationsTitle: "Publications & Works",
            teachingTitle: "Teaching Experience", 
            positionsTitle: "Current Positions & Affiliations",
            pastPositionsTitle: "Past Positions",
        },
        
        exhibitionsPage: {
            title: "Exhibitions & News",
            intro: "Where to see the work now, the latest from the studio and the press, and a full exhibition history.",
            newsTitle: "Latest News",
            tabNews: "Latest News",
            tabVideos: "Press Videos",
            tabHistory: "Exhibition History",
            tagStudio: "Studio",
            tagPress: "Press",
            videosTitle: "Interviews & Videos",
            historyTitle: "Exhibition History",
            showMore: "Show more",
            onView: "On view now",
            upcoming: "Upcoming",
            until: "Through",
            all: "All",
            solo: "Solo",
            duo: "Father–Daughter",
            group: "Group & Teaching",
            more: "Press / details",
            invite: "Interested in hosting an exhibition or visiting the studio?",
            contact: "Get in touch"
        },

        faq: {
                tabs: { authenticity: "Authenticity", shipping: "Shipping", pricing: "Pricing" },
                title: "Frequently Asked Questions",
                subtitle: "Our artworks take different journeys to reach you: originals come directly from the artist's studio in Taiwan, while prints are produced in the U.S. to make ink art more accessible worldwide.",
                
                sections: {
                    authenticity: {
                        title: "Authenticity & Creation",
                        icon: "✨",
                        questions: [
                            {
                                question: "Where are the artworks created?",
                                answer: "All original ink wash paintings are created in Taiwan by the artist **Yuan Chih-Jin (Xiaoran)** on traditional Xuan paper. Each piece is one-of-a-kind, hand-painted, inscribed, signed, and sealed by the artist."
                            },
                            {

                                question: "What's the difference between originals and prints?",
                                answer: "**Originals**: one-of-a-kind, collectible works on Xuan paper (or known as rice paper).\n**Prints**: archival giclée reproductions, made in the U.S. through trusted partners for museum-quality results, available in multiple sizes for everyday interiors."
                            }
                        ]
                    },
                    shipping: {
                        title: "Shipping & Production", 
                        icon: "🚚",
                        questions: [
                            {
                                question: "Where do orders ship from?",
                                answer: "**Originals** ship directly from the artist’s studio in Taiwan.\n**Prints** are produced and shipped from the U.S. through trusted partners. This allows us to share Taiwanese ink art more easily with collectors worldwide, especially reaching audiences in the United States."
                            },
                            {
                                question: "How do I purchase originals and prints?",
                                answer: "**Originals** require filling out the \"Original Art Inquiry Form\" and we will contact you to arrange payment and shipping.\n**Prints** can be added directly to the shopping cart for checkout."
                            },
                            {
                                question: "How long will shipping take?",
                                answer: "**Originals**: Delivery times vary by region — within Taiwan it is usually faster, while international orders take about 10–20 business days.\n**Prints**: Within the U.S., delivery speed depend on the shipping method chosen in the shopping cart. For addresses outside the U.S., it usually takes about 5–10 business days.\n"
                            }
                        ]
                    },
                    pricing: {
                        title: "Pricing & Payments",
                        icon: "💳", 
                        questions: [
                            {
                                question: "Why are prices shown in USD?",
                                answer: "We sell internationally, and USD is a standard currency most collectors understand. At checkout, your local bank may show the converted amount."
                            }
                        ]
                    }
                }
            },  

        // Connect page
        connect: {
            title: "Contact",
            subtitle: "For exhibitions, collaborations, or painting and calligraphy classes, please write to the studio.",
            collectNote: "Interested in a specific work? Use “Original Art Inquiry” on its page.",
            collectLink: "Go to the Gallery",
            emailTitle: "Email",
            copy: "Copy",
            copied: "Copied",
            printsNote: "Questions about prints, shipping or framing?",
            printsLink: "See the FAQ",
            followTitle: "Follow the studio",
            facebookTitle: "Facebook",
            facebookDesc: "In Chinese",
            instagramDesc: "In Chinese",
            pinterestDesc: "In English",
            locationText: "Studio in Taichung, Taiwan"
        },
        
        // Lightbox
        lightbox: {
            availableStatus: "Original Art Inquiry",
            soldStatus: "Original Art Sold",
            yearLabel: "Year",
            dimensionsLabel: "Size (HxW)", 
            mediumLabel: "Medium",
            formatLabel: "Format",
            shareTitle: "Share Artwork",
            closeTitle: "Close Lightbox",
            prevTitle: "Previous Artwork",
            nextTitle: "Next Artwork",
            viewTypes: {
                "original": "Original",
                "original-mockup": "Room Display (mockup frame and setting)", 
                "print-mockup": "print- room display",
            }

        },
        
        // Contact Form
        contactForm: {
            title: "Purchase Inquiry",
            subtitle: "Interested in this artwork? Please fill out the information below and we'll contact you soon",
            artworkInfoTitle: "Artwork Information",
            contactInfoTitle: "Contact Information",
            shippingInfoTitle: "Shipping Information",
            
            // Artwork info fields
            artworkTitle: "Artwork Title",
            artworkSize: "Dimensions(HxW)", 
            artworkFormat: "Framing",
            artworkYear: "Year Created",
            
            // Contact info fields
            customerName: "Full Name",
            customerEmail: "Email Address",
            customerPhone: "Phone Number",
            
            // Shipping info fields
            shippingAddress: "Shipping Address", 
            shippingMethod: "Shipping Method",
            shippingNote: "Additional Notes",
            
            // Shipping options
            shippingOptions: {
                homeDelivery: "Home Delivery",
                storePickup: "Gallery Pickup",
                courierDelivery: "Courier Service", 
                registeredMail: "Registered Mail"
            },
            
            // Button texts
            submitButton: "Send Inquiry",
            cancelButton: "Cancel", 
            closeButton: "Close",
            
            // Placeholder texts
            requiredField: "This field is required",
            emailPlaceholder: "Please enter a valid email address",
            phonePlaceholder: "Please enter your phone number", 
            addressPlaceholder: "Please enter complete mailing address",
            notePlaceholder: "Special requirements, questions, or preferred contact time (optional)",
            shippingMethodPlaceholder: "Please select shipping method",
            
            // Success/error messages
            submitSuccess: "Inquiry submitted successfully! We will contact you soon.",
            submitError: "Submission failed. Please try again later or contact us directly.",
            invalidEmail: "Please enter a valid email format",
            invalidPhone: "Please enter a valid phone number format",
            
            // Additional information
            privacyNote: "Your personal information will only be used for this inquiry. We protect your privacy.",
            responseTime: "We will respond as soon as we are available."
        },
    
        // Shopping Cart
        shopping: {
            cartTitle: "Shopping Cart",
            cartEmpty: "Your cart is empty",
            cartEmptyDesc: "Browse artworks and add your favorite Glicee Fine Art prints to the cart",
            selectSizeTitle: "Giclee - Fine Art Paper Prints",
            selectSizeSubtitle: "100% cotton fine art paper. Sizes up to 20 × 30 in come mounted on board, ready to frame. Larger sizes ship rolled in a tube, for your framer.",
            styleMounted: "Mounted on board",
            styleRolled: "Rolled print",
            diagramLabel: "Print sizes to scale, next to a 170 cm person",
            availableSizes: "Available sizes:",
            quantity: "Quantity:",
            addToCart: "Add to Cart",
            addingToCart: "Adding...",
            addedToCart: "Added to cart! View cart from homepage",
            total: "Total:",
            checkout: "Checkout",
            processing: "Processing...",
            remove: "Remove",
            
            // Shopping messages
            notAvailable: "A Giclée fine art print of this artwork is not available",
            notAvailableDesc: "If you're interested, please contact us for inquiries.",
            priceLoading: "Price Loading...",
            priceLoadFailed: "Price load failed",

            // Prints entry points near the top of the artwork details
            printsTeaser: "Fine art prints available",
            printsTeaserFrom: "Fine art prints available · from {price}",
            printsPill: "Prints",
            printsPillFrom: "Prints from {price}",
            
            // Checkout form
            checkoutTitle: "Checkout Information",
            customerInfo: "Customer Information",
            firstName: "First Name",
            lastName: "Last Name", 
            email: "Email",
            phone: "Phone Number",
            address: "Complete Address",
            city: "City",
            postalCode: "Postal Code",
            orderSummary: "Order Summary",
            note: "Note:",
            testModeWarning: "This is test mode. Actual orders will be confirmed via email and will not be charged immediately.",
            confirmOrder: "Confirm Order",
            
            // Order confirmation
            orderSuccess: "Order Confirmed Successfully!",
            orderThanks: "Thank you for your purchase! We have received your order and will contact you via email to confirm details as soon as possible.",
            orderNumber: "Order Number:",
            continueBrowsing: "Continue Browsing",
            
            // Errors
            checkoutError: "An error occurred during checkout, please try again later.",
            orderSubmitError: "Order submission failed, please try again later."
        },
        
        // Common
        common: {
            available: "Available",
            sold: "Sold",
            untitled: "Untitled",
            unknown: "Unknown",
            sizeNotSpecified: "Size not specified",
            noDescription: "No description available",
            loading: "Loading artworks...",
            viewDetails: "View Details"  
        }
    },
    
    zh: {
        // Header
        header: {
            title: "袁之靜 - 曉然文化藝術",
            subtitle: "詩書畫印，天地有大美:國畫、書法作品"
        },
        
        // Navigation  
        nav: {
            featured: "精選",
            gallery: "藝廊",
            about: "關於",
            exhibitions: "展覽・消息",
            faq: "問答",
            connect: "聯絡"
        },
        
        // Home page
        home: {
            heroTitle: "邀請您，共徜徉於詩意水墨之間",
            heroDescription: "以自然為師，融詩書畫印於一體<br>深耕中國水墨之美四十餘載<br>在這裡感受傳統國畫的雋永之美<br>體驗筆墨間的詩意與禪境",            
            featuredTitle: "精選作品",
            featuredSubtitle: "傑出作品展示",
            viewAllButton: "查看完整作品集",
            latestTitle: "最新動態",
            latestMore: "到臉書看更多近況"
        },

        //Gallery
        gallery: {
            withImages: "含圖片"
        },
        
        // Gallery filters (only non-category related)
        filters: {
            clearAll: "清除所有篩選",
            searchPlaceholder: "搜尋作品標題、描述...",
            showingAll: "顯示全部 {total} 件作品",
            showingFiltered: "顯示 {count} / {total} 件作品 ({filters} 個篩選條件)",
            showingResults: "找到 {count} / {total} 件作品",
            searchResults: "搜尋 \"{query}\" 找到 {count} 件作品",
            searchWithFilters: "搜尋 \"{query}\" 找到 {count} 件作品 ({filters} 個篩選條件)"
        },
        
        // Year periods (not categories)
        years: {
            recent: "近期 2020+",
            "2010s": "2010年代",
            earlier: "更早期"
        },
        
        // About page
        about: {
            mainTitle: "袁之靜（號曉然）",
            mainSubtitle: "水墨畫家 · 書法家 · 藝術教育者",
            quote: "「我眼中的風景，慢慢變成心中的風景。」",
            story: [
                "袁之靜，號曉然，在台中的書香之家長大。父親袁德炯是資深書法家，詩詞與筆墨是她從小的日常——還沒畫第一座山，她已經會讀詩、寫字。2013 年，父女倆在大墩文化中心聯展，兩代筆墨並肩而掛。",
                "她在職場打拚多年，筆卻從未放下，後來重回校園，取得國立台灣藝術大學書畫藝術研究所碩士。四十多年來，她向羅振賢、歐豪年等十餘位書畫名家請益，也背著畫具走進山川寫生，從玉山一路畫到伊瓜蘇瀑布。",
                "教學與創作一直並行。她曾在中興大學教國際學生畫國畫，也任教於朝陽科技大學、中臺科技大學，至今仍在大墩文化中心開設藝文研習班，年年帶著學生舉辦師生展。她曾任臺灣省中國書畫學會理事長，現為榮譽理事長。",
                "近年，她的畫從具象山水慢慢走向色塊、光影與線條交織的抽象：金色宣紙上的月亮、駛出港灣的帆船。作品展遍台灣，也遠赴義大利威尼斯；但每一幅畫，她仍用同樣的方式開始——走進山水、寫生，然後靜下心來。"
            ],
            videoTitle: "影音",
            mediaTitle: "媒體報導",
            articlesTitle: "新聞報導",
            captionNote: "",
            noCaptionNote: "",
            dubbedNote: "",
            articlesNote: "點選標題閱讀全文",
            highlightsTitle: "近期亮點",
            seeAllExhibitions: "展覽與最新消息 →",
            currentBadge: "現任",
            tabStory: "介紹",
            tabVideos: "創作紀錄片",
            tabCareer: "經歷",
            educationTitle: "學歷",
            awardsTitle: "獲獎紀錄",
            publicationsTitle: "出版與著作",
            teachingTitle: "教學經歷",
            positionsTitle: "現任職務與學會身分",
            pastPositionsTitle: "歷任職務",
        },

        exhibitionsPage: {
            title: "展覽・消息",
            intro: "現在到哪裡看得到作品、畫室與媒體的最新消息，以及完整的展覽經歷。",
            newsTitle: "最新消息",
            tabNews: "最新消息",
            tabVideos: "新聞採訪影片",
            tabHistory: "展覽紀錄",
            tagStudio: "畫室近況",
            tagPress: "媒體報導",
            videosTitle: "影音採訪",
            historyTitle: "展覽經歷",
            showMore: "顯示更多",
            onView: "現正展出",
            upcoming: "即將展出",
            until: "展至",
            all: "全部",
            solo: "個展",
            duo: "父女聯展",
            group: "聯展・師生展",
            more: "報導／詳情",
            invite: "想邀請展出，或預約參觀畫室？",
            contact: "與我們聯絡"
        },

        faq: {
                tabs: { authenticity: "真品與創作", shipping: "運送", pricing: "價格與付款" },
                title: "常見問題",
                subtitle: "作品各自有不同的旅程：原作由藝術家工作室於台灣直寄；\n藝術微噴版畫(fine art giclée prints)則於美國製作並寄送，讓水墨藝術更容易走向世界。",
                
                sections: {
                    authenticity: {
                        title: "真品與創作",
                        icon: "✨",
                        questions: [
                            {
                                question: "作品在哪裡創作？",
                                answer: "所有原作水墨畫皆由藝術家**袁之靜（曉然）**在台灣使用傳統宣紙手工創作。每件作品都是獨一無二的，經藝術家親筆繪製、落款、簽名與用印。"
                            },
                            {
                                question: "原作與印刷品有什麼差別？",
                                answer: "**原作**：宣紙上的獨一無二收藏級作品。\n**印刷品**：透過美國信賴夥伴製作的典藏級微噴複製品(fine art giclée prints)，達到博物館品質標準，提供多種尺寸適合日常居家裝飾。"
                            }
                        ]
                    },
                    shipping: {
                        title: "運送與製作",
                        icon: "🚚", 
                        questions: [
                            {
                                question: "訂單從哪裡出貨？",
                                answer: "**原作**：由曉然文化工作室於台灣直寄。\n**印刷品**：由美國合作夥伴製作並寄送，讓水墨藝術更容易由台灣推廣到全球，特別是能更便捷地觸及美國的收藏群體。"
                            },
                            {
                                question: "如何購買原作與藝術微噴版畫(fine art giclée prints)？",
                                answer: "**原作**：需填寫「原作詢價表單」，我們會與您聯繫安排付款與出貨。\n**印刷品**：可直接加入購物車結帳。"
                            },
                            {
                                question: "運送需要多長時間？",
                                answer: "**原作**：寄送時間依地區而異——台灣境內通常更快，國際訂單約 10–20 個工作天。\n**印刷品**：美國境內的寄送速度依您在購物車選擇的方式而定，美國境外通常約 5–10 個工作天。"
                            }
                        ]
                    },
                    pricing: {
                        title: "定價與付款",
                        icon: "💳",
                        questions: [
                            {
                                question: "為什麼價格顯示為美元？",
                                answer: "我們面向國際銷售，美元是大多數收藏家都理解的標準貨幣。結帳時，您的銀行可能會顯示轉換後的當地貨幣金額。"
                            }
                        ]
                    }
                }
            },
        
        // Connect page
        connect: {
            title: "聯絡",
            subtitle: "邀展合作或書畫課程，歡迎來信畫室。",
            collectNote: "想收藏某件作品？請在作品頁點「點此洽詢購買原作」。",
            collectLink: "前往藝廊",
            emailTitle: "電子郵件",
            copy: "複製",
            copied: "已複製",
            printsNote: "版畫、運送或裝裱的問題？",
            printsLink: "請看常見問題",
            followTitle: "追蹤畫室",
            facebookTitle: "Facebook",
            facebookDesc: "中文",
            instagramDesc: "中文",
            pinterestDesc: "英文",
            locationText: "工作室位於台灣台中"
        },
        
        // Lightbox
        lightbox: {
            availableStatus: "點此洽詢購買原作",
            soldStatus: "原作已售出",
            yearLabel: "年份",
            dimensionsLabel: " 尺寸(高x寬)",
            mediumLabel: "媒材", 
            formatLabel: "裝裱",
            shareTitle: "分享作品",
            closeTitle: "關閉檢視",
            prevTitle: "上一件作品",
            nextTitle: "下一件作品",
            viewTypes: {
                "original": "原作",
                "original-mockup": "房間展示(外框與場景皆為模擬)",
            }

        },

        // Contact Form
        contactForm: {
            title: "購買詢價",
            subtitle: "對此作品有興趣？請填寫以下資訊，我們將儘快與您聯繫",
            artworkInfoTitle: "作品資訊",
            contactInfoTitle: "聯絡資訊", 
            shippingInfoTitle: "配送資訊",
            
            // 作品資訊欄位
            artworkTitle: "作品名稱",
            artworkSize: "尺寸(高x寬)",
            artworkFormat: "裝裱方式",
            artworkYear: "創作年份",
            
            // 聯絡資訊欄位
            customerName: "姓名",
            customerEmail: "電子郵件",
            customerPhone: "手機號碼",
            
            // 配送資訊欄位  
            shippingAddress: "配送地址",
            shippingMethod: "配送方式",
            shippingNote: "備註說明",
            
            // 配送方式選項
            shippingOptions: {
                homeDelivery: "宅配到府",
                storePickup: "藝廊取貨", 
                courierDelivery: "快遞配送",
                registeredMail: "掛號郵寄"
            },
            
            // 按鈕文字
            submitButton: "送出詢價",
            cancelButton: "取消",
            closeButton: "關閉",
            
            // 提示文字
            requiredField: "此欄位為必填",
            emailPlaceholder: "請輸入有效的電子郵件地址",
            phonePlaceholder: "請輸入手機號碼",
            addressPlaceholder: "請輸入完整郵寄地址",
            notePlaceholder: "特殊需求、問題或偏好的聯繫時間（選填）",
            shippingMethodPlaceholder: "請選擇配送方式",
            
            // 成功/錯誤訊息
            submitSuccess: "詢價表單已送出！我們將盡快與您聯繫。",
            submitError: "送出失敗，請稍後再試或直接來電聯繫我們。",
            invalidEmail: "請輸入有效的電子郵件格式",
            invalidPhone: "請輸入有效的手機號碼格式",
            
            // 額外說明
            privacyNote: "您的個人資料僅用於此次詢價，我們會妥善保護您的隱私。",
            responseTime: "我們將會盡快回覆您的詢價。"
        },
        
        // Shopping Cart
        shopping: {
            cartTitle: "微噴印刷購物車",
            cartEmpty: "購物車是空的",
            cartEmptyDesc: "瀏覽藝廊，將喜愛的微噴印刷品加入購物車",
            selectSizeTitle: "藝術微噴印刷",
            selectSizeSubtitle: "100% 棉質藝術紙。20 × 30 吋以內裱於厚卡紙，可直接裱框；更大的尺寸以紙筒捲裝寄送，請交由裱框店裝框。",
            styleMounted: "裱厚卡紙",
            styleRolled: "捲裝寄送",
            diagramLabel: "各印刷尺寸與 170 公分人形的比例示意",
            availableSizes: "可選尺寸：",
            quantity: "數量：",
            addToCart: "加入購物車",
            addingToCart: "加入中...",
            addedToCart: "已加入購物車！回主頁面查看",
            total: "總計：",
            checkout: "結帳",
            processing: "處理中...",
            remove: "移除",
            
            // Shopping messages
            notAvailable: "此微噴印刷作品暫不提供訂購",
            notAvailableDesc: "如有興趣，請透過聯絡方式詢問。",
            priceLoading: "價格載入中...",
            priceLoadFailed: "價格載入失敗",

            // 作品資訊上方的版畫入口
            printsTeaser: "提供藝術微噴版畫",
            printsTeaserFrom: "提供藝術微噴版畫 · {price} 起",
            printsPill: "版畫",
            printsPillFrom: "版畫 {price} 起",
            
            // Checkout form
            checkoutTitle: "結帳資訊",
            customerInfo: "收件人資訊",
            firstName: "名字",
            lastName: "姓氏", 
            email: "電子郵件",
            phone: "電話號碼",
            address: "完整地址",
            city: "城市",
            postalCode: "郵遞區號",
            orderSummary: "訂單摘要",
            note: "注意：",
            testModeWarning: "這是測試模式。實際訂單將通過電子郵件確認，不會立即收費。",
            confirmOrder: "確認訂單",
            
            // Order confirmation
            orderSuccess: "訂單確認成功！",
            orderThanks: "感謝您的訂購！我們已收到您的訂單，將會盡快通過電子郵件與您聯繫確認詳細資訊。",
            orderNumber: "訂單編號：",
            continueBrowsing: "繼續瀏覽",
            
            // Errors
            checkoutError: "結帳過程中發生錯誤，請稍後再試。",
            orderSubmitError: "訂單提交失敗，請稍後再試。"
        },
        
        // Common
        common: {
            available: "可售",
            sold: "已售",
            untitled: "無題",
            unknown: "未知",
            sizeNotSpecified: "尺寸未標明",
            noDescription: "無作品說明",
            loading: "載入作品中...",
            viewDetails: "放大檢視"
        }
    }
};