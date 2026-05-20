document.addEventListener('DOMContentLoaded', () => {
    // HTML'deki sahne konteynerini bul
    const container = document.querySelector('[data-hero-stage]');
    if (!container) return;

    // Yüklenecek modelin yolunu HTML'den (data-model) al
    const modelPath = container.getAttribute('data-model');
    const loaderText = container.querySelector('.hero-stage-loader');

    // 1. TEMEL SAHNE KURULUMU (Scene, Camera, Renderer)
    const scene = new THREE.Scene();
    
    // Kamerayı konteynerin boyutlarına göre ayarla
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 5); // Kamerayı biraz geriye al (Modelin boyutuna göre burayı 3 veya 10 yapman gerekebilir)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // alpha: true arkaplanı transparan yapar
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Yüksek çözünürlüklü ekranlar için
    container.appendChild(renderer.domElement);

    // 2. IŞIKLANDIRMA
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Genel ortam ışığı
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // 2.5 PARTICLES (Dust Motes)
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 300;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 15;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.04,
        color: 0xE8D5B7, // accent color
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // 3. FARE TAKİP DEĞİŞKENLERİ
    let loadedModel = null;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
 // YENİ KOD
document.addEventListener('mousemove', (event) => {
    // Konteynerin ekrandaki konumunu ve sınırlarını al
    const rect = container.getBoundingClientRect();
    
    // Konteynerin kendi merkezini bul
    const containerCenterX = rect.left + (rect.width / 2);
    const containerCenterY = rect.top + (rect.height / 2);
    
    // Sapmayı konteynerin merkezine göre hesapla
    mouseX = (event.clientX - containerCenterX) * 0.001;
    mouseY = (event.clientY - containerCenterY) * 0.001;
});

    // Ekran boyutu değiştiğinde sahneyi güncelle
    window.addEventListener('resize', () => {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // 4. MODELİ YÜKLEME
    const loader = new THREE.GLTFLoader();
    loader.load(modelPath, (gltf) => {
        loadedModel = gltf.scene;
        
        // Modeli merkeze oturtmak için opsiyonel ayarlar:
         loadedModel.position.set(0, .5, 0);
         loadedModel.scale.set(10, 10, 10); // Çok büyük/küçükse burayı (0.5, 0.5, 0.5) gibi değiştirebilirsin
        loadedModel.traverse((child) => {
            if (child.isMesh && child.geometry) {
                child.geometry.center(); // Geometriyi merkeze taşır
            }
        });

        scene.add(loadedModel);

        // Model yüklendiğinde "Loading scene" yazısını gizle
        if (loaderText) {
            loaderText.style.opacity = '0';
            setTimeout(() => loaderText.style.display = 'none', 300);
        }
    }, undefined, (error) => {
        console.error('Model yüklenirken hata oluştu:', error);
    });

    // 5. ANİMASYON VE RENDER DÖNGÜSÜ
    const animate = () => {
        requestAnimationFrame(animate);

        // Yavaşça dönen parçacıklar
        particlesMesh.rotation.y += 0.001;
        particlesMesh.rotation.x += 0.0005;

        // Eğer model yüklendiyse rotasyonunu fareye göre yumuşakça (lerp) güncelle
        if (loadedModel) {
            targetRotationY = mouseX * 1.2; // Sağa sola bakış açısı limiti
            targetRotationX = mouseY * 1.2; // Yukarı aşağı bakış açısı limiti

            // 0.05 değeri yumuşaklık/hız katsayısıdır
            loadedModel.rotation.y += (targetRotationY - loadedModel.rotation.y) * 0.05;
            loadedModel.rotation.x += (targetRotationX - loadedModel.rotation.x) * 0.05;
        }

        renderer.render(scene, camera);
    };

    // Döngüyü başlat
    animate();
});