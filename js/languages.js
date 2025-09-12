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
            connect: "Connect"
        },
        
        // Home page
        home: {
            featuredTitle: "Featured Artworks",
            viewAllButton: "View Complete Gallery"
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
            mainTitle: "Artist Yuan Chi-Jing (Xiaoran) | Painter & Educator",
            videoTitle: "Documentary Film",
            // Artist introduction paragraphs
            introParagraph1: "Yuan Chi-Jing, known as Xiaoran, was raised in a scholarly family with deep roots in classical Chinese literature. From childhood, she studied poetry and calligraphy, developing a profound foundation that would guide her lifelong dedication to Chinese ink painting and art education.",
            introParagraph2: "She holds an M.F.A. from National Taiwan University of Arts and has practiced painting and calligraphy for over forty years. Throughout her career, she studied under renowned masters including Luo Zhen-xian, Wang Jing-hao, Ou Hao-nian, and many other distinguished artists.",
            introParagraph3: "Drawing inspiration from nature, she travels to mountains and rivers to observe the interplay of light, form, and spirit. Her work integrates poetry, calligraphy, painting, and seal carving, creating compositions that pursue the classical ideals of depth, height, and transcendent beauty.",            
            educationTitle: "Education",
            awardsTitle: "Awards & Recognition",
            publicationsTitle: "Publications & Works",
            teachingTitle: "Teaching Experience", 
            positionsTitle: "Current Positions & Affiliations",
            exhibitionsTitle: "Solo Exhibitions",
            groupShowsTitle: "Group Exhibitions & Teaching Shows",
            
            // Education content
            education: [
                "M.F.A., Graduate Institute of Painting and Calligraphy, National Taiwan University of Arts",
                "Bachelor's Degree, National Chung Hsing University"
            ],
            
            // Awards content
            awards: [
                "2024 Taichung Artists Relay Exhibition 'Artistic Heritage Transmission' - Selected",
                "2024 Taichung Contemporary Artists - Selected", 
                "2010 Taichung County Art Exhibition - Calligraphy Category Second Place",
                "2010 Nantou County 11th Yushan Art Award - Calligraphy Category Selected",
                "2009 Taichung County Art Exhibition - Calligraphy Category Excellence Award",
                "2008 Taichung County Art Exhibition - Calligraphy Category Selected",
                "2006 International Women Artists Hundred Ink Painting Exhibition - Selected (Chinese Art Unity Association)"
            ],
            
            // Publications content
            publications: [
                "\"The Great Beauty of Heaven and Earth\" ISBN 978-626-7374-49-8 (2024)",
                "\"Poetry, Calligraphy and Painting\" ISBN 978-957-43-0510-0 (2014)",
                "\"Coming and Going Without Mind · Misty Cloud Scenery\" Master's Thesis on Ink Painting Creation (2012)"
            ],
            
            // Teaching experience
            teaching: [
                "National Chung Hsing University - International Student Cultural Exchange Program / Chinese Painting Class for Chinese Language Students, Adjunct Lecturer (2012—Present)",
                "National Chung Hsing University - Micro-course Lecturer (2018—2020)",
                "Central Taiwan University of Science and Technology - Art Course Adjunct Lecturer (2012—2019)",
                "Chaoyang University of Technology - Calligraphy and Ink Painting Course Adjunct Lecturer (2018—2019)",
                "Taichung Dadun Cultural Center - Art Workshop Teacher (2017—Present)",
                "Taichung Houyi Community University - New Realm of Ink Painting Course Teacher (2017—2020)",
                "Xiaoran Cultural Arts Studio - Director (2017—Present)",
                "Taichung Dakeng Community University - Lize Chinese Painting Society Instructor (2012—2017)"
            ],
            
            // Current positions
            positions: [
                "Xiaoran Cultural Arts Studio - Director",
                "Taiwan Province Chinese Painting and Calligraphy Association - Honorary President / Current President",
                "Chinese Painting and Calligraphy Art Research Association - Secretary General",  
                "NTUA International Contemporary Art Alliance - Executive Director",
                "Taichung Women Artists Painting Association - Executive Director",
                "Central Taiwan University of Science and Technology Art Center - Advisory Committee Member",
                "Taichung Dakeng Lize Cultural Heritage Research Association - President",
                "Fu Chien-fu Painting and Calligraphy Association - Director",
                "Taichung Moyuan Yaji Painting Association - Director",
                "Taichung Chinese Painting and Calligraphy Association - Director",
                "Zhaozhong Painting Association - Supervisor",
                "Member of Republic of China Painting Association, Taichung Calligraphy Association, Chinese Art Association, Yitao Painting Association, Chinese Arts Association, Taiwan Traditional and Modern Art Association",
                "Zhongyuan Painting and Calligraphy Research Institute of Henan Province, China - Senior Art Advisor"
            ],
            
            // Solo exhibitions
            exhibitions: [
                "2024 \"Heritage of Central Taiwan · The Great Beauty of Heaven and Earth\" | Central Taiwan University of Science and Technology Art Center",
                "2024 \"The Great Beauty of Heaven and Earth\" Yuan Chi-Jing Ink Painting Exhibition | Taichung Huludun Cultural Center (Taichung Artists Relay Exhibition)",
                "2023 \"Quiet Contemplation and Freedom\" Yuan Chi-Jing Ink Painting Exhibition | Taichung Dadun Cultural Center",
                "2022 \"Wonderful Dharma of Nature\" Yuan Chi-Jing Ink Painting Exhibition | Taichung Huludun Cultural Center",
                "2018 \"Flowing Snow and Water ~ Yuan Chi-Jing Ink Painting Exhibition\" | Chaoyang University of Technology Design Hall Gallery",
                "2018 \"Flowing Clouds and Water\" Yuan Chi-Jing Ink Painting Exhibition | Taichung Dadun Cultural Center",
                "2014 \"Poetry, Calligraphy and Painting\" Yuan Chi-Jing Painting and Calligraphy Exhibition | Central Taiwan University of Science and Technology Art Center",
                "2013 \"Poetry, Calligraphy and Artistic Intent\" Yuan De-jiong and Yuan Chi-Jing Father-Daughter Painting and Calligraphy Exhibition | Taichung Dadun Cultural Center",
                "2012 \"Coming and Going Without Mind · Misty Cloud Scenery\" Yuan Chi-Jing Ink Painting Exhibition | National Taiwan University of Arts Zhen-Shan-Mei Gallery"
            ],
            
            // Group exhibitions
            groupShows: [
                "2023 \"Silent Nourishment\" Yuan Chi-Jing Teacher-Student Ink Painting Exhibition | Taichung Dadun Cultural Center",
                "2020 \"Summer Brilliance\" Yuan Chi-Jing Teacher-Student Chinese Painting Exhibition | Taichung Veterans General Hospital Art Corridor",
                "2019 \"Poetry, Calligraphy and Painting\" Yuan Xiaoran Teacher-Student Achievement Exhibition | Chaoyang University of Technology Design Hall Gallery",
                "2019 Teacher-Student Chinese Painting Achievement Exhibition | Taichung Dadun Cultural Center",
                "2019 Poetry, Calligraphy and Painting Class Joint Exhibition | Taichung City Government Huizhong Building Gallery",
                "2018 \"Cinnabar Green Flora Expo\" Poetry, Calligraphy and Painting Class Teacher-Student Joint Exhibition | Dongshi Hakka Cultural Park",
                "2017 Poetry, Calligraphy and Painting Teacher-Student Joint Exhibition | Taichung Armed Forces General Hospital Art Corridor",
                "2017 \"Flourishing Spring Branches\" Lize Chinese Painting Class Joint Exhibition | Fengyuan Hospital Art Corridor"
            ]
        },
        
        // Connect page
        connect: {
            title: "Connect With Me",
            subtitle: "Follow my artistic journey and stay updated with new works, exhibitions, and creative insights.",
            emailTitle: "Email",
            emailDesc: "For inquiries, commissions, or collaborations",
            facebookTitle: "Facebook Fan Page", 
            facebookDesc: "Latest artworks and behind-the-scenes content",
            facebookButton: "Visit Fan Page",
            locationText: "Based in Taichung, Taiwan"
        },
        
        // Lightbox
        lightbox: {
            availableStatus: "Original Art Inquiry",
            soldStatus: "Original Art Sold",
            yearLabel: "Year",
            dimensionsLabel: "Size(HxW)", 
            mediumLabel: "Medium",
            formatLabel: "Format",
            shareTitle: "Share Artwork",
            closeTitle: "Close Lightbox",
            prevTitle: "Previous Artwork",
            nextTitle: "Next Artwork",
            viewTypes: {
                "original": "Original",
                "original-mockup": "Room Display", 
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
            submitSuccess: "Inquiry submitted successfully! We will contact you within 24 hours.",
            submitError: "Submission failed. Please try again later or contact us directly.",
            invalidEmail: "Please enter a valid email format",
            invalidPhone: "Please enter a valid phone number format",
            
            // Additional information
            privacyNote: "Your personal information will only be used for this inquiry. We protect your privacy.",
            responseTime: "We typically respond to inquiries within 24 hours."
        },
    
        // Shopping Cart
        shopping: {
            cartTitle: "Shopping Cart",
            cartEmpty: "Your cart is empty",
            cartEmptyDesc: "Browse artworks and add your favorite Glicee Fine Art prints to the cart",
            selectSizeTitle: "Giclee - Fine Art Paper Prints",
            selectSizeSubtitle: "Thick Matboard mounted, hang or frame ready",
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
            notAvailable: "The Glclee Fine Art Print of this artwork  is not available for purchase",
            notAvailableDesc: "If you're interested, please contact us for inquiries.",
            priceLoading: "Price Loading...",
            priceLoadFailed: "Price load failed",
            
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
            connect: "聯絡"
        },
        
        // Home page
        home: {
            heroTitle: "邀請您，共徜徉於詩意水墨之間",
            heroDescription: "以自然為師，融詩書畫印於一體<br>深耕中國水墨之美四十餘載<br>在這裡感受傳統國畫的雋永之美<br>體驗筆墨間的詩意與禪境",            
            featuredTitle: "精選作品",
            featuredSubtitle: "傑出作品展示",
            viewAllButton: "查看完整作品集"
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
            mainTitle: "藝術家袁之靜（號曉然）｜書畫創作與教育者",
            videoTitle: "創作紀錄片",
            // Artist introduction paragraphs
            introParagraph1: "袁之靜，號曉然，自幼承庭訓，得傳家風，習詩詞與書法，厚植國學基礎，寄情丹青，深耕中國水墨之美，致力於書畫創作與藝術教育傳承。",
            introParagraph2: "畢業於國立台灣藝術大學書畫藝術研究所（M.F.A.），並獲國立中興大學學士學位。長年習書作畫逾四十載，師承羅振賢、王景浩、蔡友、高義璋、游世河、黃才松、王子奚、林進忠、林隆達、李蕭錕、薛平南、歐豪年、蘇峰男、蕭進興等多位書畫名家。",
            introParagraph3: "以自然為師，工作之餘走訪名山大川，從天地萬物中觀照意境與筆法。創作風格融合詩、書、畫、印，講求畫中意境的靈動與書寫節奏的和諧，用詩句構圖、以書法入畫、妥善用印，追求畫面中深遠、高遠、悠遠的精神境界。",
            educationTitle: "學歷",
            awardsTitle: "獲獎紀錄",
            publicationsTitle: "出版與著作",
            teachingTitle: "教學經歷",
            positionsTitle: "現任職務與學會身分", 
            exhibitionsTitle: "個展一覽",
            groupShowsTitle: "聯展與教學成果展",
            
            // Education content
            education: [
                "國立台灣藝術大學 書畫藝術研究所 碩士（M.F.A.）",
                "國立中興大學 學士"
            ],
            
            // Awards content
            awards: [
                "2024 台中市美術家接力展「藝術薪火相傳」 入選",
                "2024 台中市當代藝術家 遴選",
                "2010 台中縣美展 書法類第二名",
                "2010 南投縣第十一屆玉山美術獎 書法類入選",
                "2009 台中縣美展 書法類優選",
                "2008 台中縣美展 書法類入選",
                "2006 國際女畫家百人水墨畫展 正選（中華藝術同心會）"
            ],
            
            // Publications content
            publications: [
                "《天地有大美》ISBN 978-626-7374-49-8（2024）",
                "《書情畫意》ISBN 978-957-43-0510-0（2014）",
                "《去住無心‧煙雲情境》水墨創作研究碩士論文（2012）"
            ],
            
            // Teaching experience
            teaching: [
                "國立中興大學 國際學生文化交流課程∕華語國畫班 兼任講師（2012—迄今）",
                "國立中興大學 微型課程講師（2018—2020）",
                "中台科技大學 藝術課程兼任講師（2012—2019）",
                "朝陽科技大學 書法與水墨畫課程兼任講師（2018—2019）",
                "臺中市大墩文化中心 藝文研習班教師（2017—迄今）",
                "臺中市後驛社區大學 水墨新境課程教師（2017—2020）",
                "曉然文化藝術工作室 負責人（2017—迄今）",
                "臺中市大坑社區大學 麗澤國畫社授課教師（2012—2017）"
            ],
            
            // Current positions
            positions: [
                "曉然文化藝術工作室 負責人",
                "台灣省中國書畫學會 榮譽理事長∕現任理事長",
                "中華書畫藝術研究會 秘書長",
                "臺藝大國際當代藝術聯盟 常務理事",
                "臺中市華藝女子畫會 常務理事",
                "中台科技大學 藝術中心 諮詢委員",
                "臺中市大坑麗澤文化資產研究學會 理事長",
                "傅狷夫書畫學會 理事",
                "臺中市墨緣雅集畫會 理事",
                "臺中市中華書畫協會 理事",
                "昭中畫會 監事",
                "中華民國畫學會、臺中市書法學會、中國美術協會、藝濤畫會、中國藝術協會、台灣傳統與現代藝術學會 會員",
                "中國河南省中原書畫研究院 高級藝術顧問"
            ],
            
            // Solo exhibitions
            exhibitions: [
                "2024 《薪傳中台‧天地大美》｜中台科技大學藝文中心",
                "2024 《天地有大美》袁之霖水墨創作展｜台中市葫蘆墩文化中心（台中市美術家接力展）",
                "2023 《靜觀自在》袁之霖水墨展｜台中市大墩文化中心",
                "2022 《妙法自然》袁之霖水墨展｜台中市葫蘆墩文化中心",
                "2018 《行雪流水～袁之霖水墨展》｜朝陽科技大學設計禮堂藝廊",
                "2018 《行雲流水》袁之霖水墨展｜台中市大墩文化中心",
                "2014 《書情畫意》袁之霖書畫創作展｜中台科技大學藝文中心",
                "2013 《書情審意》袁德炯、袁之霖父女書畫展｜台中市大墩文化中心",
                "2012 《去住無心．煙雲情境》袁之霖水墨創作展｜國立台灣藝術大學 真善美藝廊"
            ],
            
            // Group exhibitions
            groupShows: [
                "2023 《潤物無聲》袁之霖師生水墨畫展｜台中市大墩文化中心",
                "2020 《夏艷》袁之霖師生國畫展｜台中署立醫院藝術走廊",
                "2019 《書情畫意》袁曉然師生成果展｜朝陽科技大學設計禮堂藝廊",
                "2019 師生國畫成果展｜台中市大墩文化中心",
                "2019 書情畫意書畫班聯展｜台中市政府惠中樓藝廊",
                "2018 《丹青花博》書情畫意班師生聯展｜東勢客家文化園區",
                "2017 書情畫意師生聯展｜國軍台中總醫院藝宣走廊",
                "2017 《華枝春滿》麗澤國畫班聯展｜豐原醫院藝文走廊"
            ]
        },
        
        // Connect page
        connect: {
            title: "與我聯絡",
            subtitle: "關注我的藝術旅程，獲取最新作品、展覽和創作見解。",
            emailTitle: "電子郵件",
            emailDesc: "諮詢、委託或合作事宜",
            facebookTitle: "臉書粉絲專頁",
            facebookDesc: "最新作品與幕後花絮",
            facebookButton: "造訪粉絲頁",
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
                "original-mockup": "房間展示",
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
            submitSuccess: "詢價表單已送出！我們將在24小時內與您聯繫。",
            submitError: "送出失敗，請稍後再試或直接來電聯繫我們。",
            invalidEmail: "請輸入有效的電子郵件格式",
            invalidPhone: "請輸入有效的手機號碼格式",
            
            // 額外說明
            privacyNote: "您的個人資料僅用於此次詢價，我們會妥善保護您的隱私。",
            responseTime: "我們通常會在2個工作日內回覆您的詢價。"
        },
        
        // Shopping Cart
        shopping: {
            cartTitle: "微噴印刷購物車",
            cartEmpty: "購物車是空的",
            cartEmptyDesc: "瀏覽藝廊，將喜愛的微噴印刷品加入購物車",
            selectSizeTitle: "藝術微噴印刷",
            selectSizeSubtitle: "厚卡紙裝裱，可掛可裱",
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