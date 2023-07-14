// Obtém o elemento de vídeo da câmera
const cam = document.getElementById("cam");

// Função para iniciar o vídeo da câmera frontal...dispositivo notebook ou celular
const startVideo = async () => {
  try {
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    let constraints = {};

    if (isMobileDevice) {
      constraints = {
        video: {
          facingMode: { exact: "environment" },
        },
      };
    } else {
      constraints = {
        video: { facingMode: "user" },
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    cam.srcObject = stream;
  } catch (error) {
    console.error("Erro ao iniciar o vídeo da câmera:", error);
  }
};

// Função para carregar os rótulos das imagens de cada pessoa cadastrada
const loadLabels = async () => {
  try {
    const labels = [
      "Antony",
      "Eduardo",
      "Fábio",
      "Fernando",
      "Filipe",
      "Leonardo",
      "Lucas",
      "Prof Samuel",
      "Raphael",
      "Rogerio",
      "Salvan",
      "Samuel",
    ]; // Array de pessoas
    const labeledDescriptors = [];

    await Promise.all(
      labels.map(async (label) => {
        const descriptions = [];

        // Percorre as imagens de cada pasta
        for (let i = 1; i <= 3; i++) {
          try {
            const img = await faceapi.fetchImage(
              `/assets/lib/face-api/labels/${label}/${i}.jpg`
            );

            // Detecta a face, pontos de referência e descritores da face na imagem
            const detections = await faceapi
              .detectSingleFace(img) // verifica uma pessoa por foto
              .withFaceLandmarks() // verifica marcas de expressão
              .withFaceDescriptor(); // identifica as descrições da face

            if (detections) {
              // adiciona no array as descrições da face identificada
              descriptions.push(detections.descriptor);
            }
            console.log(label + ": Carregada foto: " + i);
          } catch (error) {
            console.error(
              "Erro ao carregar a imagem de: " + label + " na posição: " + i,
              error
            );
          }
        }

        // Cria um objeto de descritores de rosto rotulados para o nome atual
        if (descriptions.length > 0) {
          labeledDescriptors.push(
            new faceapi.LabeledFaceDescriptors(label, descriptions)
          );
        }
      })
    );

    return labeledDescriptors;
  } catch (error) {
    console.error("Erro ao carregar os rótulos das imagens:", error);
    return [];
  }
};

// Carrega os modelos necessários e inicia o vídeo quando eles estiverem prontos
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/assets/lib/face-api/models"), // modela o enquadramento de um rosto
  faceapi.nets.faceLandmark68Net.loadFromUri("/assets/lib/face-api/models"), // analisa marcas de expressão
  faceapi.nets.faceRecognitionNet.loadFromUri("/assets/lib/face-api/models"), // resize do video
  faceapi.nets.faceExpressionNet.loadFromUri("/assets/lib/face-api/models"), // analisa expressões faciais
  faceapi.nets.ssdMobilenetv1.loadFromUri("/assets/lib/face-api/models"), // requisito
])
  .then(() => startVideo())
  .catch((error) => console.error("Erro ao carregar os modelos:", error));

// Evento "play" do vídeo da câmera
cam.addEventListener("play", async () => {
  try {
    // Cria um canvas para desenhar as detecções faciais
    const canvas = faceapi.createCanvasFromMedia(cam);
    const canvasSize = {
      width: cam.width,
      height: cam.height,
    };

    // Carrega os rótulos das imagens de cada pessoa cadastrada
    const labels = await loadLabels();

    // Ajusta as dimensões do canvas
    faceapi.matchDimensions(canvas, canvasSize);

    // Adiciona o canvas ao corpo do documento HTML
    document.body.appendChild(canvas);

    // Executa repetidamente a detecção de rostos e desenho no canvas
    setInterval(async () => {
      // Detecta todos os rostos no vídeo usando um modelo de detecção facial leve
      const detections = await faceapi
        .detectAllFaces(cam, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks() // analisa marcas de expressão
        .withFaceExpressions() // analisa expressões faciais
        .withFaceDescriptors(); // analisa descrições da face

      // Redimensiona as detecções para corresponder ao tamanho do canvas
      const resizedDetections = faceapi.resizeResults(detections, canvasSize);

      // Cria um identificador de rosto com base nos rótulos carregados e em uma tolerância de correspondência
      const faceMatcher = new faceapi.FaceMatcher(labels, 0.6);

      // Encontra a melhor correspondência de cada detecção de rosto com base nos descritores
      const results = resizedDetections.map((d) =>
        faceMatcher.findBestMatch(d.descriptor)
      );

      // Limpa o canvas
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      // Desenha as detecções faciais no canvas
      faceapi.draw.drawDetections(canvas, resizedDetections);

      // Desenha o nome da pessoa
      results.forEach((result, index) => {
        const box = resizedDetections[index].detection.box;
        const { label } = result;
        new faceapi.draw.DrawTextField([`${label}`], box.topLeft).draw(canvas);
      });
    }, 250);
  } catch (error) {
    console.error("Erro durante a detecção de rostos:", error);
  }
});
