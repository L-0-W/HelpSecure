use face_id::analyzer::FaceAnalyzer;
use image;

#[tokio::main]
async fn main() {
    let analyzer = FaceAnalyzer::from_hf().build().await.unwrap();
    let img = image::DynamicImage::new_rgb8(100, 100);
    let faces = analyzer.analyze(&img).unwrap();
    for face in faces {
        let emb: Option<Vec<f32>> = face.embedding;
    }
}
