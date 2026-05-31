use api::auth::hash_password;
fn main() {
    println!("{}", hash_password("teste1234").unwrap());
}
