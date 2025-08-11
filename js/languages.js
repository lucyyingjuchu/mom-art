// languages.js - All text content in one place
const LANGUAGE_DATA = {
    en: {
        // Header
        header: {
            title: "Yuan Chi-Jing - Xiaoran Cultural Arts",
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
            heroTitle: "Welcome to My Art World",
            heroDescription: "Explore a collection of paintings and calligraphy that captures the beauty of traditional and contemporary art forms. Each piece tells a story through delicate brushstrokes and thoughtful composition.",
            featuredTitle: "Featured Artworks",
            featuredSubtitle: "A curated selection of exceptional pieces",
            viewAllButton: "View Complete Gallery"
        },
        
        //Gallery
        gallery: {
            withImages: "with images",
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
            abstract: "Abstract",
            traditional: "Uncategorized" 
        },
        
        // Location labels  
        locations: {
            huangshan: "HuangShan",
            alishan: "AliShan",
            taroko: "Taroko",
            hehuanshan: "Mt. HeHuan",
            yushan: "Mt. Jade",
            liushidanshan: "Mt. Sixty Stone",
            guishandao: "GuiShan Island",
            longdong: "Dragon Cave",
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
            mainTitle: "Artist Yuan Chi-Jing (Xiaoran) | Painter & Educator",
            videoTitle: "Documentary Film",
            // Artist introduction paragraphs
            introParagraph1: "Yuan Chi-Jing, known as Xiaoran, was raised in a scholarly family with deep roots in classical Chinese literature. From childhood, she studied poetry and calligraphy, developing a profound foundation that would guide her lifelong dedication to Chinese ink painting and art education.",
            introParagraph2: "She holds an M.F.A. from National Taiwan University of Arts and has practiced painting and calligraphy for over forty years. Throughout her career, she studied under renowned masters including Luo Zhen-xian, Wang Jing-hao, Ou Hao-nian, and many other distinguished artists.",
            introParagraph3: "Drawing inspiration from nature, she travels to mountains and rivers to observe the interplay of light, form, and spirit. Her work integrates poetry, calligraphy, painting, and seal carving, creating compositions that pursue the classical ideals of depth, height, and transcendent beauty.",            educationTitle: "Education",
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
                "National Chung Hsing University - International Student Cultural Exchange Program / Chinese Painting Class for Chinese Language Students, Adjunct Lecturer (2012–Present)",
                "National Chung Hsing University - Micro-course Lecturer (2018–2020)",
                "Central Taiwan University of Science and Technology - Art Course Adjunct Lecturer (2012–2019)",
                "Chaoyang University of Technology - Calligraphy and Ink Painting Course Adjunct Lecturer (2018–2019)",
                "Taichung Dadun Cultural Center - Art Workshop Teacher (2017–Present)",
                "Taichung Houyi Community University - New Realm of Ink Painting Course Teacher (2017–2020)",
                "Xiaoran Cultural Arts Studio - Director (2017–Present)",
                "Taichung Dakeng Community University - Lize Chinese Painting Society Instructor (2012–2017)"
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
            heroDescription: "以自然為師，融詩書畫印於一體\n深耕中國水墨之美四十餘載\n在這裡感受傳統國畫的雋永之美\n體驗筆墨間的詩意與禪境",            featuredTitle: "精選作品",
            featuredSubtitle: "精心策劃的傑出作品",
            viewAllButton: "查看完整作品集"
        },

        //Gallery
    
        gallery: {
            withImages: "含圖片"
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
            abstract: "抽象",
            traditional: "未分類"  // Change this
        },
        
        // Location labels
        locations: {
            huangshan: "黃山",
            alishan: "阿里山",
            taroko: "太魯閣",
            hehuanshan: "合歡山", 
            yushan: "玉山",
            liushidanshan: "六十石山",
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
            // Artist introduction paragraphs
            introParagraph1: "袁之靜，號曉然，自幼承庭訓，得傳家風，習詩詞與書法，厚植國學基礎，寄情丹青，深耕中國水墨之美，致力於書畫創作與藝術教育傳承。",
            introParagraph2: "畢業於國立台灣藝術大學書畫藝術研究所（M.F.A.），並獲國立中興大學學士學位。長年習書作畫逾四十載，師承羅振賢、王景浩、蔡友、高義瑝、游世河、黃才松、王子奚、林進忠、林隆達、李蕭錕、薛平南、歐豪年、蘇峰男、蕭進興等多位書畫名家。",
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
                "2006 國際女畫家百名水墨畫展 正選（中華藝術同心會）"
            ],
            
            // Publications content
            publications: [
                "《天地有大美》ISBN 978-626-7374-49-8（2024）",
                "《書情畫意》ISBN 978-957-43-0510-0（2014）",
                "《去住無心·煙雲情境》水墨創作研究碩士論文（2012）"
            ],
            
            // Teaching experience
            teaching: [
                "國立中興大學 國際學生文化交流課程／華語國畫班 兼任講師（2012–迄今）",
                "國立中興大學 微型課程講師（2018–2020）",
                "中臺科技大學 藝術課程兼任講師（2012–2019）",
                "朝陽科技大學 書法與水墨畫課程兼任講師（2018–2019）",
                "臺中市大墩文化中心 藝文研習班教師（2017–迄今）",
                "臺中市後驛社區大學 水墨新境課程教師（2017–2020）",
                "曉然文化藝術工作室 負責人（2017–迄今）",
                "臺中市大坑社區大學 麗澤國畫社授課教師（2012–2017）"
            ],
            
            // Current positions
            positions: [
                "曉然文化藝術工作室 負責人",
                "台灣省中國書畫學會 榮譽理事長／現任理事長",
                "中華書畫藝術研究會 秘書長",
                "臺藝大國際當代藝術聯盟 常務理事",
                "臺中市華藝女子畫會 常務理事",
                "中臺科技大學 藝術中心 諮詢委員",
                "臺中市大坑麗澤文化資產研究學會 理事長",
                "傅狷夫書畫學會 理事",
                "臺中市墨緣雅集畫會 理事",
                "臺中市中華書畫協會 理事",
                "朝中畫會 監事",
                "中華民國畫學會、臺中市書法學會、中國美術協會、藝濤畫會、中國藝術協會、臺灣傳統與現代藝術學會 會員",
                "中國河南省中原書畫研究院 高級藝術顧問"
            ],
            
            // Solo exhibitions
            exhibitions: [
                "2024 《薪傳中臺·天地大美》｜中臺科技大學藝文中心",
                "2024 《天地有大美》袁之靜水墨創作展｜台中市葫蘆墩文化中心（台中市美術家接力展）",
                "2023 《靜觀自在》袁之靜水墨展｜台中市大墩文化中心",
                "2022 《妙法自然》袁之靜水墨展｜台中市葫蘆墩文化中心",
                "2018 《行雪流水～袁之靜水墨展》｜朝陽科技大學設計禮堂藝廊",
                "2018 《行雲流水》袁之靜水墨展｜台中市大墩文化中心",
                "2014 《書情畫意》袁之靜書畫創作展｜中臺科技大學藝文中心",
                "2013 《書情審意》袁德炯、袁之靜父女書畫展｜台中市大墩文化中心",
                "2012 《去住無心．煙雲情境》袁之靜水墨創作展｜國立台灣藝術大學 真善美藝廊"
            ],
            
            // Group exhibitions
            groupShows: [
                "2023 《潤物無聲》袁之靜師生水墨畫展｜台中市大墩文化中心",
                "2020 《夏艷》袁之靜師生國畫展｜台中署立醫院藝術走廊",
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
            loading: "載入作品中...",
            viewDetails: "放大檢視"
        }
    }
};