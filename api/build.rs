fn main() {
    println!("cargo:rerun-if-changed=src/polyfill.c");
    cc::Build::new()
        .file("src/polyfill.c")
        .compile("polyfill");
}
